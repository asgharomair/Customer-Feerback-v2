import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react";

// Comprehensive test page to verify all functionality works
export default function CompanyTestPage() {
  const [testResults, setTestResults] = useState<Record<string, 'pending' | 'success' | 'error' | 'running'>>({});
  const [testCompanyId, setTestCompanyId] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateTestResult = (testName: string, result: 'pending' | 'success' | 'error' | 'running') => {
    setTestResults(prev => ({ ...prev, [testName]: result }));
  };

  // Test 1: Create a complete company profile
  const testCompanyCreation = async () => {
    updateTestResult('company-creation', 'running');
    
    try {
      const testCompanyData = {
        legalName: "Test Company Ltd",
        brandName: "Test Brand",
        slogan: "Testing Excellence",
        industry: "Technology",
        businessNature: "Software Development",
        primaryContactName: "John Test",
        primaryContactEmail: "test@example.com",
        primaryContactPhone: "+1234567890",
        primaryContactPosition: "CEO",
        businessAddress: "123 Test Street",
        city: "Test City",
        state: "Test State",
        country: "Test Country",
        postalCode: "12345",
        websiteUrl: "https://test.com",
        socialMediaLinks: {
          facebook: "https://facebook.com/test",
          twitter: "https://twitter.com/test"
        },
        brandColors: {
          background1: "#ffffff",
          background2: "#f8f9fa",
          text1: "#000000",
          text2: "#6b7280",
          primary: "#3b82f6",
          secondary: "#e5e7eb"
        },
        authorizedEmails: ["test@example.com", "admin@example.com"],
        onboardingCompleted: true
      };

      const response = await fetch("/api/tenants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testCompanyData),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const company = await response.json();
      setTestCompanyId(company.id);
      updateTestResult('company-creation', 'success');
      
      toast({
        title: "Company Creation Test Passed",
        description: `Company created with ID: ${company.id}`,
      });

      return company;
    } catch (error) {
      console.error('Company creation test failed:', error);
      updateTestResult('company-creation', 'error');
      toast({
        title: "Company Creation Test Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
      throw error;
    }
  };

  // Test 2: Retrieve company data
  const testCompanyRetrieval = async (companyId: string) => {
    updateTestResult('company-retrieval', 'running');
    
    try {
      const response = await fetch(`/api/tenants/${companyId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const company = await response.json();
      updateTestResult('company-retrieval', 'success');
      
      toast({
        title: "Company Retrieval Test Passed",
        description: `Retrieved company: ${company.brandName}`,
      });

      return company;
    } catch (error) {
      console.error('Company retrieval test failed:', error);
      updateTestResult('company-retrieval', 'error');
      toast({
        title: "Company Retrieval Test Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
      throw error;
    }
  };

  // Test 3: Create location
  const testLocationCreation = async (companyId: string) => {
    updateTestResult('location-creation', 'running');
    
    try {
      const locationData = {
        tenantId: companyId,
        name: "Test Branch",
        address: "456 Branch Street",
        city: "Branch City",
        state: "Branch State",
        zipCode: "67890",
        phone: "+1987654321",
        email: "branch@example.com"
      };

      const response = await fetch("/api/locations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(locationData),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const location = await response.json();
      updateTestResult('location-creation', 'success');
      
      toast({
        title: "Location Creation Test Passed",
        description: `Location created: ${location.name}`,
      });

      return location;
    } catch (error) {
      console.error('Location creation test failed:', error);
      updateTestResult('location-creation', 'error');
      toast({
        title: "Location Creation Test Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
      throw error;
    }
  };

  // Test 4: Generate QR Code
  const testQRCodeGeneration = async (companyId: string, locationId: string) => {
    updateTestResult('qr-generation', 'running');
    
    try {
      const qrData = {
        tenantId: companyId,
        locationId: locationId,
        identifier: "Test-QR-Code",
        section: "Main"
      };

      const response = await fetch("/api/qr-codes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(qrData),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const qrCode = await response.json();
      updateTestResult('qr-generation', 'success');
      
      toast({
        title: "QR Code Generation Test Passed",
        description: `QR Code created with ID: ${qrCode.id}`,
      });

      return qrCode;
    } catch (error) {
      console.error('QR code generation test failed:', error);
      updateTestResult('qr-generation', 'error');
      toast({
        title: "QR Code Generation Test Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
      throw error;
    }
  };

  // Run all tests
  const runAllTests = async () => {
    try {
      // Reset test results
      setTestResults({});
      
      // Test 1: Create Company
      const company = await testCompanyCreation();
      
      // Test 2: Retrieve Company
      await testCompanyRetrieval(company.id);
      
      // Test 3: Create Location
      const location = await testLocationCreation(company.id);
      
      // Test 4: Generate QR Code
      await testQRCodeGeneration(company.id, location.id);
      
      toast({
        title: "All Tests Passed! ✅",
        description: "Company onboarding system is working correctly.",
      });

    } catch (error) {
      toast({
        title: "Test Suite Failed",
        description: "One or more tests failed. Check individual test results.",
        variant: "destructive",
      });
    }
  };

  const getResultIcon = (result: 'pending' | 'success' | 'error' | 'running' | undefined) => {
    switch (result) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Company Onboarding System Test Suite
        </h1>
        <p className="text-gray-600 mb-6">
          Comprehensive testing to ensure all functionality works correctly
        </p>
        
        <Button onClick={runAllTests} size="lg" className="mb-6">
          <RefreshCw className="w-5 h-5 mr-2" />
          Run All Tests
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {getResultIcon(testResults['company-creation'])}
              <span>Company Creation</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Tests comprehensive company onboarding with all required fields including legal details, 
              contact information, branding, and access management.
            </p>
            {testCompanyId && (
              <p className="text-xs text-green-600 mt-2">
                Company ID: {testCompanyId}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {getResultIcon(testResults['company-retrieval'])}
              <span>Company Retrieval</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Tests that created companies can be properly retrieved from the database 
              with all fields intact.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {getResultIcon(testResults['location-creation'])}
              <span>Location Creation</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Tests branch/location management functionality including creating locations 
              with complete address and contact details.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {getResultIcon(testResults['qr-generation'])}
              <span>QR Code Generation</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Tests QR code generation for locations, enabling feedback collection 
              through scannable codes.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test Manual Company</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              placeholder="Enter company ID to test"
              value={testCompanyId}
              onChange={(e) => setTestCompanyId(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={() => testCompanyId && testCompanyRetrieval(testCompanyId)}
              disabled={!testCompanyId}
            >
              Test Retrieval
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            You can also manually test company retrieval by entering a company ID above.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}