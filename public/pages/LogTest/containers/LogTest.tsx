/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
*/

import React, { useEffect, useState } from "react";
import {
    EuiFlexGroup,
    EuiFlexItem,
    EuiPanel,
    EuiSpacer,
    EuiText,
    EuiCodeBlock,
    EuiFormRow,
    EuiFieldText,
    EuiFieldNumber,
    EuiTextArea,
    EuiButton
} from "@elastic/eui";
import { RouteComponentProps } from "react-router-dom";
import { PageHeader } from "../../../components/PageHeader/PageHeader";
import { setBreadcrumbs } from "../../../utils/helpers";
import { BREADCRUMBS } from "../../../utils/constants";
import { DataStore } from '../../../store/DataStore';

export const LogTest: React.FC<RouteComponentProps> = () => {


    const handleExecuteLogTest = async () => {
        // await DataStore.logTests.logTest({
        //     document: {
        //         queue: queue,
        //         location: location,
        //         agent_metadata: {
        //             "agent.groups": agentGroups,
        //             "agent.host.architecture": agentHostArchitecture,
        //             "agent.host.hostname": agentHostHostname,
        //             "agent.host.os.name": agentHostOsName,
        //             "agent.host.os.platform": agentHostOsPlatform,
        //             "agent.host.os.type": agentHostOsType,
        //             "agent.host.os.version": agentHostOsVersion,
        //             "agent.id": agentId,
        //             "agent.name": agentName,
        //             "agent.version": agentVersion
        //         },
        //         event: logInput,
        //         trace_level: "info"
        //     },
        //     integrationId: "" 
        // });
    }


    const [agentGroups, setAgentGroups] = useState("");
    const [agentHostArchitecture, setAgentHostArchitecture] = useState("");
    const [agentHostHostname, setAgentHostHostname] = useState("");
    const [agentHostOsName, setAgentHostOsName] = useState("");
    const [agentHostOsPlatform, setAgentHostOsPlatform] = useState("");
    const [agentHostOsType, setAgentHostOsType] = useState("");
    const [agentHostOsVersion, setAgentHostOsVersion] = useState("");
    const [agentId, setAgentId] = useState("");
    const [agentName, setAgentName] = useState("");
    const [agentVersion, setAgentVersion] = useState("");
    const [queue, setQueue] = useState<number | undefined>(undefined);
    const [location, setLocation] = useState("");
    const [logInput, setLogInput] = useState("");
    const [testResult, setTestResult] = useState("");

    useEffect(() => {
        setBreadcrumbs([BREADCRUMBS.NORMALIZATION, BREADCRUMBS.LOG_TEST]);
    }, []);

    const handleTest = () => {

        handleExecuteLogTest();

        // Mock result for now
        const mockResult = {
            status: "success",
            parsed_log: {
                timestamp: new Date().toISOString(),
                agent: {
                    id: agentId,
                    name: agentName,
                    version: agentVersion
                },
                message: logInput,
                queue: queue
            }
        };
        setTestResult(JSON.stringify(mockResult, null, 2));
    };

    const handleClearSession = () => {
        setAgentGroups("");
        setAgentHostArchitecture("");
        setAgentHostHostname("");
        setAgentHostOsName("");
        setAgentHostOsPlatform("");
        setAgentHostOsType("");
        setAgentHostOsVersion("");
        setAgentId("");
        setAgentName("");
        setAgentVersion("");
        setQueue(undefined);
        setLocation("");
        setLogInput("");
        setTestResult("");
    };

    return (
        <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem grow={false}>
                <PageHeader>
                    <EuiText size="s">
                        <h1>Log Test</h1>
                    </EuiText>
                </PageHeader>
            </EuiFlexItem>

            <EuiSpacer size="m" />

            <EuiFlexItem>
                <EuiPanel>
                    <EuiText size="s">
                        <h3>Agent Metadata (Optional)</h3>
                    </EuiText>
                    <EuiSpacer size="m" />

                    <EuiFlexGroup gutterSize="m" wrap>
                        <EuiFlexItem style={{ minWidth: "300px" }}>
                            <EuiFormRow label="agent.groups" fullWidth>
                                <EuiFieldText
                                    value={agentGroups}
                                    onChange={(e) => setAgentGroups(e.target.value)}
                                    fullWidth
                                />
                            </EuiFormRow>
                        </EuiFlexItem>

                        <EuiFlexItem style={{ minWidth: "300px" }}>
                            <EuiFormRow label="agent.host.architecture" fullWidth>
                                <EuiFieldText
                                    value={agentHostArchitecture}
                                    onChange={(e) => setAgentHostArchitecture(e.target.value)}
                                    fullWidth
                                />
                            </EuiFormRow>
                        </EuiFlexItem>

                        <EuiFlexItem style={{ minWidth: "300px" }}>
                            <EuiFormRow label="agent.host.hostname" fullWidth>
                                <EuiFieldText
                                    value={agentHostHostname}
                                    onChange={(e) => setAgentHostHostname(e.target.value)}
                                    fullWidth
                                />
                            </EuiFormRow>
                        </EuiFlexItem>

                        <EuiFlexItem style={{ minWidth: "300px" }}>
                            <EuiFormRow label="agent.host.os.name" fullWidth>
                                <EuiFieldText
                                    value={agentHostOsName}
                                    onChange={(e) => setAgentHostOsName(e.target.value)}
                                    fullWidth
                                />
                            </EuiFormRow>
                        </EuiFlexItem>

                        <EuiFlexItem style={{ minWidth: "300px" }}>
                            <EuiFormRow label="agent.host.os.platform" fullWidth>
                                <EuiFieldText
                                    value={agentHostOsPlatform}
                                    onChange={(e) => setAgentHostOsPlatform(e.target.value)}
                                    fullWidth
                                />
                            </EuiFormRow>
                        </EuiFlexItem>

                        <EuiFlexItem style={{ minWidth: "300px" }}>
                            <EuiFormRow label="agent.host.os.type" fullWidth>
                                <EuiFieldText
                                    value={agentHostOsType}
                                    onChange={(e) => setAgentHostOsType(e.target.value)}
                                    fullWidth
                                />
                            </EuiFormRow>
                        </EuiFlexItem>

                        <EuiFlexItem style={{ minWidth: "300px" }}>
                            <EuiFormRow label="agent.host.os.version" fullWidth>
                                <EuiFieldText
                                    value={agentHostOsVersion}
                                    onChange={(e) => setAgentHostOsVersion(e.target.value)}
                                    fullWidth
                                />
                            </EuiFormRow>
                        </EuiFlexItem>

                        <EuiFlexItem style={{ minWidth: "300px" }}>
                            <EuiFormRow label="agent.id" fullWidth>
                                <EuiFieldText
                                    value={agentId}
                                    onChange={(e) => setAgentId(e.target.value)}
                                    fullWidth
                                />
                            </EuiFormRow>
                        </EuiFlexItem>

                        <EuiFlexItem style={{ minWidth: "300px" }}>
                            <EuiFormRow label="agent.name" fullWidth>
                                <EuiFieldText
                                    value={agentName}
                                    onChange={(e) => setAgentName(e.target.value)}
                                    fullWidth
                                />
                            </EuiFormRow>
                        </EuiFlexItem>

                        <EuiFlexItem style={{ minWidth: "300px" }}>
                            <EuiFormRow label="agent.version" fullWidth>
                                <EuiFieldText
                                    value={agentVersion}
                                    onChange={(e) => setAgentVersion(e.target.value)}
                                    fullWidth
                                />
                            </EuiFormRow>
                        </EuiFlexItem>
                    </EuiFlexGroup>

                    <EuiSpacer size="l" />

                    <EuiText size="s">
                        <h3>Additional Fields</h3>
                    </EuiText>
                    <EuiSpacer size="m" />

                    <EuiFlexGroup gutterSize="m" wrap>
                        <EuiFlexItem style={{ minWidth: "300px" }}>
                            <EuiFormRow label="queue" fullWidth>
                                <EuiFieldNumber
                                    value={queue}
                                    onChange={(e) => setQueue(e.target.value ? Number(e.target.value) : undefined)}
                                    fullWidth
                                />
                            </EuiFormRow>
                        </EuiFlexItem>

                        <EuiFlexItem style={{ minWidth: "300px" }}>
                            <EuiFormRow label="location" fullWidth>
                                <EuiFieldText
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    fullWidth
                                />
                            </EuiFormRow>
                        </EuiFlexItem>
                    </EuiFlexGroup>

                    <EuiSpacer size="l" />

                    <EuiFormRow label="Log Input" fullWidth>
                        <EuiTextArea
                            placeholder="Enter log data to test..."
                            value={logInput}
                            onChange={(e) => setLogInput(e.target.value)}
                            rows={6}
                            fullWidth
                        />
                    </EuiFormRow>

                    <EuiSpacer size="m" />

                    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                        <EuiFlexItem grow={false}>
                            <EuiButton
                                fill
                                iconType="play"
                                onClick={handleTest}
                            >
                                Test
                            </EuiButton>
                        </EuiFlexItem>

                        <EuiFlexItem grow={false}>
                            <EuiButton
                                iconType="broom"
                                onClick={handleClearSession}
                            >
                                Clear session
                            </EuiButton>
                        </EuiFlexItem>
                    </EuiFlexGroup>

                    {testResult && (
                        <>
                            <EuiSpacer size="l" />
                            <EuiText size="s">
                                <h3>Test Result</h3>
                            </EuiText>
                            <EuiSpacer size="m" />
                            <EuiCodeBlock language="json" paddingSize="m" isCopyable>
                                {testResult}
                            </EuiCodeBlock>
                        </>
                    )}
                </EuiPanel>
            </EuiFlexItem>
        </EuiFlexGroup>
    );
};