Feature: Salesforce authenticated session
  As a QA automation engineer
  I want to reuse an authenticated Salesforce session
  So that BDD scenarios can run without repeated manual email verification

  @smoke @auth
  Scenario: Open Salesforce using prepared authenticated state
    Given I open my Salesforce Developer org
    Then the Salesforce Lightning application is authenticated
