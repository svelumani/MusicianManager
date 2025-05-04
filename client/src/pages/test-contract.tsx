import React from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';

const TestContractPage = () => {
  const [_, navigate] = useLocation();

  // This test page simply redirects to the monthly contract response page with a test token
  const handleViewTestContract = () => {
    // Navigate to the monthly contract response page with the test token
    navigate('/monthly/respond?token=test-token-456');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center pt-20">
      <div className="container max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-6">Test Monthly Contract</h1>
          <p className="text-lg text-gray-600 mb-8">
            Use this page to test the monthly contract response functionality
          </p>
          <Button size="lg" onClick={handleViewTestContract}>
            View Test Contract
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TestContractPage;