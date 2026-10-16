@lead @regression
Feature: Salesforce Lead creation and editing

  Background:
    Given I am authenticated in Salesforce
    And I navigate to the Sales App
    And I open the Leads page

  @smoke @create-lead
  Scenario: Create a Lead with unique valid details
    When I create a Lead with unique valid details
    Then the Lead should be created successfully
    And the Lead should have a valid 18-character Salesforce ID
    And the Lead details should match the submitted data

  @edit-lead @regression
  Scenario: Update a Lead status and verify persistence
    Given I have created a Lead with valid details
    When I update the Lead status to "Working - Contacted"
    Then the Lead status should be "Working - Contacted"
    And the updated status should persist after page reload
