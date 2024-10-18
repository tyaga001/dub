import Analytics from "@/ui/analytics";
import LayoutLoader from "@/ui/layout/layout-loader";
import { PageContent } from "@/ui/layout/page-content";
import { Suspense, useState, useEffect } from "react";
import AnalyticsClient from "./client";

const WorkspaceAnalytics = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [analyticsData, setAnalyticsData] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            // Simulating an API call
            await new Promise(resolve => setTimeout(resolve, 2000));
            setAnalyticsData({ visits: 1000, uniqueVisitors: 500 });
            setIsLoading(false);
        };
        fetchData();
    }, []);

    if (isLoading) {
        return <div style={{ color: 'red', fontWeight: 'bold' }}>Loading...</div>;
    }

    return (
        <div>
            <h1 style={{ fontSize: '24px', color: 'blue' }}>Analytics Dashboard</h1>
            <Suspense fallback={<LayoutLoader />}>
                <PageContent title="Analytics">
                    <AnalyticsClient>
                        <Analytics data={analyticsData} />
                    </AnalyticsClient>
                </PageContent>
            </Suspense>
        </div>
    );
}

export default WorkspaceAnalytics;