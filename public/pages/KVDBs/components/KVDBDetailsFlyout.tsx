/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {
  EuiAccordion,
  EuiCodeBlock,
  EuiFlexGrid,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTabbedContent,
  EuiTitle,
} from "@elastic/eui";
import { get } from "lodash";
import { KVDBItem } from "../../../../types";
import { Metadata } from "./Metadata";
import { AssetViewer } from "./AssetViewer";

interface KVDBDetailsFlyoutProps {
  kvdb: KVDBItem;
  onClose: () => void;
}

const detailsMapLabels: { [key: string]: string } = {
  "document.id": "ID",
  "document.name": "Name",
  "integration.title": "Integration",
  "document.title": "Title",
  "document.author": "Author",
  "document.enabled": "Enabled",
  "document.metadata.author.url": "URL",
  "document.references": "References",
  "document.date": "Date",
  space: "Space",
};

export const KVDBDetailsFlyout: React.FC<KVDBDetailsFlyoutProps> = ({
  kvdb,
  onClose,
}) => {
  const document = kvdb.document ?? { id: "" };

  // Handle space field - it can be a string or an object with name property
  const spaceValue =
    typeof kvdb.space === "string"
      ? kvdb.space
      : kvdb.space && typeof kvdb.space === "object" && "name" in kvdb.space
        ? kvdb.space.name || ""
        : "";

  const kvdbData = {
    "document.id": document.id || kvdb.id,
    "integration.title": kvdb.integration?.title,
    "document.title": document.title,
    "document.date": document.date,
    "document.author": document.author,
    "document.enabled": document.enabled,
    "document.references": document.references,
    "document.metadata.author.url": document.metadata?.author?.url,
    space: spaceValue,
  };

  const visualTab = (
    <>
      <EuiSpacer />
      <EuiFlexGrid columns={2}>
        {[
          "document.id",
          "integration.title",
          "document.title",
          ["document.date", "date"],
          "document.author",
          ["document.enabled", "boolean_yesno"],
          ["document.references", "url"],
          "space",
        ].map((item) => {
          const [field, type] =
            typeof item === "string" ? [item, "text"] : item;
          return (
            <EuiFlexItem key={field}>
              <Metadata
                label={detailsMapLabels[field]}
                value={get(kvdbData, field)}
                type={type as "text" | "date" | "boolean_yesno" | "url"}
              />
            </EuiFlexItem>
          );
        })}
      </EuiFlexGrid>
      {document.metadata?.author?.url && (
        <>
          <EuiSpacer />
          <EuiFlexGrid columns={2}>
            <EuiFlexItem>
              <Metadata
                label={detailsMapLabels["document.metadata.author.url"]}
                value={document.metadata.author.url}
                type="url"
              />
            </EuiFlexItem>
          </EuiFlexGrid>
        </>
      )}
      {document.content && (
        <>
          <EuiSpacer />
          <EuiAccordion
            id="content"
            buttonContent="Content"
            paddingSize="s"
            initialIsOpen={true}
          >
            <AssetViewer content={document.content} />
          </EuiAccordion>
        </>
      )}
    </>
  );

  const jsonTab = (
    <EuiCodeBlock language="json" isCopyable={true} paddingSize="m">
      {JSON.stringify(kvdb, null, 2)}
    </EuiCodeBlock>
  );

  return (
    <EuiFlyout onClose={onClose} ownFocus size="l">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2>
            {document.title
              ? `KVDB details - ${document.title}`
              : "KVDB details"}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiTabbedContent
          tabs={[
            {
              id: "visual",
              name: "Visual",
              content: visualTab,
            },
            {
              id: "json",
              name: "JSON",
              content: jsonTab,
            },
          ]}
        />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
