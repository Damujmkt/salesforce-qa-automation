
@lead-conversion @regression
Feature: Salesforce Lead to Opportunity Conversion

  Background:
    Given I am authenticated in Salesforce
    And I navigate to the Sales App
    And I open the Leads page

  @smoke @new-opportunity
  Scenario: TC01 - Convert Lead into new Account, Contact and Opportunity
    Given I have created a Lead with valid details
    When I open the Lead conversion modal
    And I choose to create a new Account, Contact and Opportunity
    And I enter a unique Opportunity name
    And I convert the Lead
    Then the Lead conversion should succeed
    When I navigate to the converted Opportunity
    Then the new Opportunity should be displayed
    And the Opportunity should reference the new Account
    And the Opportunity should contain the converted Contact
    And the Opportunity Owner should be populated
    And the Opportunity Stage should be "Prospecting"
