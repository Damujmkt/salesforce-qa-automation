@lead-conversion @regression
Feature: Salesforce Lead to Opportunity Conversion

  Background:
    Given I am authenticated in Salesforce
    And I navigate to the Sales App
    And I open the Leads page

  @smoke @new-opportunity @tc01
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
    And the converted Contact should belong to the Opportunity Account
    And the Opportunity Owner should be populated
    And the Opportunity Stage should be "Prospecting"

  @tc02 @existing-account
  Scenario: TC02 - Convert Lead using existing Account and new Contact
    Given I prepare unique conversion data
    And an existing Account matches the Lead company
    And I create the matching Lead for conversion
    When I open the Lead conversion modal
    And I select the existing Account for conversion
    And I choose to create a new Contact
    And I choose to create a new Opportunity
    And I enter a unique Opportunity name
    And I convert the Lead
    Then the Lead conversion should succeed
    And the converted Account ID should match the existing Account ID
    And a new Contact should be associated with that Account
    And the new Opportunity should reference the expected Account

  @tc03 @existing-account-contact
  Scenario: TC03 - Convert Lead using existing Account and existing Contact
    Given I prepare unique conversion data
    And an existing Account matches the Lead company
    And an existing Contact matches the Lead under that Account
    And I create the matching Lead for conversion
    When I open the Lead conversion modal
    And I select the existing Account for conversion
    And I select the existing Contact for conversion
    And I choose to create a new Opportunity
    And I enter a unique Opportunity name
    And I convert the Lead
    Then the Lead conversion should succeed
    And the converted Account ID should match the existing Account ID
    And the converted Contact ID should match the existing Contact ID
    And the new Opportunity should reference the expected Account

  @tc04 @existing-contact @opportunity-details
  Scenario: TC04 - Reuse existing Contact and validate converted Opportunity
    Given I prepare unique conversion data
    And an existing Account matches the Lead company
    And an existing Contact matches the Lead under that Account
    And I create the matching Lead for conversion
    When I open the Lead conversion modal
    And I select the Account associated with the existing Contact
    And I select the existing Contact for conversion
    And I choose to create a new Opportunity
    And I enter a unique Opportunity name
    And I convert the Lead
    Then the Lead conversion should succeed
    And the converted Account ID should match the existing Account ID
    And the converted Contact ID should match the existing Contact ID
    When I navigate to the converted Opportunity
    Then the new Opportunity should be displayed
    And the Opportunity should reference the expected Account
    And the Opportunity should contain the expected Contact
    And the Opportunity Owner should be populated
    And the Opportunity Stage should be "Prospecting"
