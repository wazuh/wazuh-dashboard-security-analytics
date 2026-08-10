/*
 * Copyright Wazuh Inc.
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { OPENSEARCH_DASHBOARDS_URL } from '../support/constants';

// Wazuh: e2e coverage for #430 — unified search/filter URL round-trip and the
// Integration column CTA cross-navigation. Written per Strict TDD process
// (RED before GREEN) but NOT executed in this session: `yarn cypress:run`
// requires a live docker/osd-dev instance, which was unavailable here. Treat
// this spec as "GREEN by inspection, unverified by environment" like every
// other test added in this change — run it once the Docker OSD env is synced.
describe('Unified search & filtering (#430)', () => {
  describe('URL round-trip on a server-paginated table (Rules)', () => {
    it('restores search text, Status, Integration and page from a fresh tab', () => {
      cy.visit(
        `${OPENSEARCH_DASHBOARDS_URL}/app/security-analytics-dashboards#/rules?query=aws&status=enabled&integration=aws&page=2`
      );

      // Search box restores the query text.
      cy.get('input[placeholder="Search rules"]').should('have.value', 'aws');

      // Status dropdown restores to "Enabled".
      cy.get('[data-test-subj="entityFilterBarStatus"]').should('have.value', 'enabled');

      // Integration combo box restores the selected integration name.
      cy.get('[data-test-subj="entityFilterBarIntegration"]').should('contain.text', 'aws');

      // Pagination restores to page 2 (1-based UI, EuiBasicTable renders 0-based
      // pageIndex internally — assert on the active page control instead).
      cy.get('.euiPagination [aria-current="true"]').should('contain.text', '2');
    });

    it('keeps `space` and other params untouched after a debounced query change', () => {
      cy.visit(
        `${OPENSEARCH_DASHBOARDS_URL}/app/security-analytics-dashboards#/rules?status=enabled&space=standard`
      );

      cy.get('input[placeholder="Search rules"]').type('windows');

      // Wait past the hook's own debounce (300ms) plus the container's local
      // debounce (300ms) before asserting on the URL.
      cy.wait(700);

      cy.location('hash').should('include', 'query=windows');
      cy.location('hash').should('include', 'status=enabled');
      cy.location('hash').should('include', 'space=standard');
    });
  });

  describe('Integration column CTA cross-navigation', () => {
    it('Rules Integration cell -> Decoders lands with the integration name pre-filled', () => {
      cy.visit(`${OPENSEARCH_DASHBOARDS_URL}/app/security-analytics-dashboards#/rules`);
      cy.get('[data-test-subj="integrationCellLink"]')
        .first()
        .invoke('text')
        .then((integrationName) => {
          cy.get('[data-test-subj="integrationCellLink"]').first().click();
          cy.contains('Go to integration decoders').click();

          cy.location('hash').should('include', '/decoders');
          cy.location('hash').should('include', `query=${encodeURIComponent(integrationName)}`);
          cy.get('input[placeholder="Search decoders"]').should('have.value', integrationName);
        });
    });

    it('Decoders Integration cell -> Rules lands with the integration name pre-filled', () => {
      cy.visit(`${OPENSEARCH_DASHBOARDS_URL}/app/security-analytics-dashboards#/decoders`);
      cy.get('[data-test-subj="integrationCellLink"]')
        .first()
        .invoke('text')
        .then((integrationName) => {
          cy.get('[data-test-subj="integrationCellLink"]').first().click();
          cy.contains('Go to integration rules').click();

          cy.location('hash').should('include', '/rules');
          cy.location('hash').should('include', `query=${encodeURIComponent(integrationName)}`);
          cy.get('input[placeholder="Search rules"]').should('have.value', integrationName);
        });
    });

    it('KVDBs Integration cell -> Rules lands with the integration name pre-filled', () => {
      cy.visit(`${OPENSEARCH_DASHBOARDS_URL}/app/security-analytics-dashboards#/kvdbs`);
      cy.get('[data-test-subj="integrationCellLink"]')
        .first()
        .invoke('text')
        .then((integrationName) => {
          cy.get('[data-test-subj="integrationCellLink"]').first().click();
          cy.contains('Go to integration rules').click();

          cy.location('hash').should('include', '/rules');
          cy.location('hash').should('include', `query=${encodeURIComponent(integrationName)}`);
        });
    });
  });
});
