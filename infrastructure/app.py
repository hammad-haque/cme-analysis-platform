#!/usr/bin/env python3
"""
CDK App entry point for CME Analysis Platform
"""

import aws_cdk as cdk
from cdk_stack import CMEAnalysisPlatformStack

app = cdk.App()

# Deploy the stack
CMEAnalysisPlatformStack(
    app, 
    "CMEAnalysisPlatformStack",
    env=cdk.Environment(
        account=app.node.try_get_context("account") or None,
        region=app.node.try_get_context("region") or "us-east-1"
    ),
    description="CME Analysis Platform - AI-powered CME recording analysis"
)

app.synth()

