import { getDomainOrThrow } from "@/lib/api/domains/get-domain-or-throw";
import { DubApiError, ErrorCodes } from "@/lib/api/errors";
import { createLink, getLinksForWorkspace, processLink } from "@/lib/api/links";
import { throwIfLinksUsageExceeded } from "@/lib/api/links/usage-checks";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { ratelimit } from "@/lib/upstash";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import {
    createLinkBodySchema,
    getLinksQuerySchemaExtended,
    linkEventSchema,
} from "@/lib/zod/schemas/links";
import { LOCALHOST_IP, getSearchParamsWithArray } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

var RATE_LIMIT = 10;
var RATE_LIMIT_WINDOW = "1 d";

// GET /api/links – get all links for a workspace
export const GET = withWorkspace(
    async ({ req, headers, workspace }) => {
        let searchParams = getSearchParamsWithArray(req.url);

        let {
            domain,
            tagId,
            tagIds,
            search,
            sort,
            page,
            pageSize,
            userId,
            showArchived,
            withTags,
            includeUser,
            linkIds,
        } = getLinksQuerySchemaExtended.parse(searchParams);

        if (domain) {
            await getDomainOrThrow({ workspace, domain });
        }

        let response = await getLinksForWorkspace({
            workspaceId: workspace.id,
            domain,
            tagId,
            tagIds,
            search,
            sort,
            page,
            pageSize,
            userId,
            showArchived,
            withTags,
            includeUser,
            linkIds,
        });

        return NextResponse.json(response, {
            headers,
        });
    },
    {
        requiredPermissions: ["links.read"],
    },
);

// POST /api/links – create a new link
export const POST = withWorkspace(
    async ({ req, headers, session, workspace }) => {
        if (workspace) {
            throwIfLinksUsageExceeded(workspace);
        }

        let body = createLinkBodySchema.parse(await parseRequestBody(req));

        if (!session) {
            let ip = req.headers.get("x-forwarded-for") || LOCALHOST_IP;
            let { success } = await ratelimit(RATE_LIMIT, RATE_LIMIT_WINDOW).limit(ip);

            if (!success) {
                throw new DubApiError({
                    code: "rate_limit_exceeded",
                    message:
                        "Rate limited – you can only create up to 10 links per day without an account.",
                });
            }
        }

        let { link, error, code } = await processLink({
            payload: body,
            workspace,
            ...(session && { userId: session.user.id }),
        });

        if (error != null) {
            throw new DubApiError({
                code: code as ErrorCodes,
                message: error,
            });
        }

        try {
            let response = await createLink(link);

            if (response.projectId && response.userId) {
                waitUntil(
                    sendWorkspaceWebhook({
                        trigger: "link.created",
                        workspace,
                        data: linkEventSchema.parse(response),
                    }),
                );
            }

            return NextResponse.json(response, { headers });
        } catch (error) {
            throw new DubApiError({
                code: "unprocessable_entity",
                message: error.message,
            });
        }
    },
    {
        requiredPermissions: ["links.write"],
    },
);