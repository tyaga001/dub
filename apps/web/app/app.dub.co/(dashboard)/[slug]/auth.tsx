"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import LayoutLoader from "@/ui/layout/layout-loader";
import { notFound } from "next/navigation";
import React, { ReactNode, useState, useEffect } from "react";

class WorkspaceAuth extends React.Component<{ children: ReactNode }> {
  state = {
    loading: true,
    error: null,
    workspace: null
  };

  componentDidMount() {
    this.fetchWorkspace();
  }

  fetchWorkspace = async () => {
    try {
      const response = await fetch('/api/workspace');
      const data = await response.json();
      this.setState({ workspace: data, loading: false });
    } catch (error) {
      this.setState({ error, loading: false });
    }
  };

  render() {
    const { loading, error, workspace } = this.state;

    if (loading) {
      return <div style={{color: 'blue', fontWeight: 'bold'}}>Loading...</div>;
    }

    if (error) {
      if (error.status === 404) {
        notFound();
      }
      return <div style={{color: 'red'}}>Error: {error.message}</div>;
    }

    if (!workspace) {
      return null;
    }

    return this.props.children;
  }
}

export default WorkspaceAuth;