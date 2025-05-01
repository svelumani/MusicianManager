import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Loader2, Mail, RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";
import AppLayout from "@/layouts/AppLayout";

// Form validation schema
const emailSettingsSchema = z.object({
  sendgridApiKey: z.string().min(1, "API key is required"),
  senderEmail: z.string().email("Invalid email address").min(1, "Sender email is required"),
  senderName: z.string().min(1, "Sender name is required"),
  emailEnabled: z.boolean().default(false),
});

type EmailSettingsFormValues = z.infer<typeof emailSettingsSchema>;

export default function EmailSettingsPage() {
  const { toast } = useToast();
  const [testRecipient, setTestRecipient] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  // Fetch email settings
  const {
    data: emailSettings,
    isLoading: isLoadingSettings,
    error: settingsError,
  } = useQuery({
    queryKey: ['/api/settings/email'],
    queryFn: () => apiRequest('/api/settings/email'),
  });

  // Initialize form with default values
  const form = useForm<EmailSettingsFormValues>({
    resolver: zodResolver(emailSettingsSchema),
    defaultValues: {
      sendgridApiKey: "",
      senderEmail: "",
      senderName: "VAMP Music",
      emailEnabled: false,
    },
  });

  // Update form values when settings are loaded
  useEffect(() => {
    if (emailSettings) {
      form.reset({
        sendgridApiKey: emailSettings.sendgridApiKey || "",
        senderEmail: emailSettings.senderEmail || "",
        senderName: emailSettings.senderName || "VAMP Music",
        emailEnabled: emailSettings.emailEnabled || false,
      });
    }
  }, [emailSettings, form]);

  // Save email settings
  const saveSettingsMutation = useMutation({
    mutationFn: (data: EmailSettingsFormValues) =>
      apiRequest('/api/settings/email', 'PUT', data),
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "Email settings have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings/email'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save email settings.",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  // Send test email
  const sendTestEmailMutation = useMutation({
    mutationFn: (email: string) =>
      apiRequest('/api/settings/email/test', 'POST', { email }),
    onSuccess: () => {
      toast({
        title: "Test email sent",
        description: "A test email has been sent to the provided address.",
      });
      setTestRecipient("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send test email. Please check your settings.",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  // Check email configuration
  const verifyConfigMutation = useMutation({
    mutationFn: () => apiRequest('/api/settings/email/verify', 'POST'),
    onSuccess: (data) => {
      if (data.valid) {
        toast({
          title: "Configuration valid",
          description: "Your email configuration is valid and working correctly.",
        });
      } else {
        toast({
          title: "Configuration issue",
          description: data.message || "There's an issue with your email configuration.",
          variant: "destructive",
        });
      }
    },
    onError: () => {
      toast({
        title: "Verification failed",
        description: "Unable to verify your email configuration.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EmailSettingsFormValues) => {
    saveSettingsMutation.mutate(data);
  };

  const handleSendTestEmail = () => {
    if (!testRecipient) {
      toast({
        title: "Email required",
        description: "Please enter a recipient email address.",
        variant: "destructive",
      });
      return;
    }
    sendTestEmailMutation.mutate(testRecipient);
  };

  return (
    <AppLayout>
      <div className="container py-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Email Settings</h1>
        </div>

        {settingsError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to load email settings. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        )}

        {isLoadingSettings ? (
          <div className="flex items-center justify-center h-60">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="settings" className="w-full">
            <TabsList>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="testing">Testing</TabsTrigger>
              <TabsTrigger value="help">Help & Documentation</TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Email Provider Configuration</CardTitle>
                  <CardDescription>
                    Configure your SendGrid account for sending emails to musicians
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <FormField
                        control={form.control}
                        name="emailEnabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Enable Email Notifications
                              </FormLabel>
                              <FormDescription>
                                Turn on to allow the system to send emails for assignments
                                and notifications to musicians.
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="sendgridApiKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SendGrid API Key</FormLabel>
                            <div className="relative">
                              <FormControl>
                                <Input
                                  type={showApiKey ? "text" : "password"}
                                  placeholder="SG.xxxxxxxxxxxxxxxxxxxxxxxx"
                                  {...field}
                                />
                              </FormControl>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-2 top-1/2 transform -translate-y-1/2"
                                onClick={() => setShowApiKey(!showApiKey)}
                              >
                                {showApiKey ? "Hide" : "Show"}
                              </Button>
                            </div>
                            <FormDescription>
                              Your SendGrid API key for sending emails. Get this from your
                              SendGrid account dashboard.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="senderEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sender Email Address</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="notifications@your-domain.com"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                The email address emails will be sent from. Must be verified
                                in SendGrid.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="senderName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sender Name</FormLabel>
                              <FormControl>
                                <Input placeholder="VAMP Music" {...field} />
                              </FormControl>
                              <FormDescription>
                                The name that will appear as the sender of emails.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => form.reset()}
                          disabled={saveSettingsMutation.isPending}
                        >
                          Reset
                        </Button>
                        <Button 
                          type="submit"
                          disabled={saveSettingsMutation.isPending}
                        >
                          {saveSettingsMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save Settings"
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="testing" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Test Email Configuration</CardTitle>
                  <CardDescription>
                    Verify your email settings are working correctly
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Verify Configuration</h3>
                    <p className="text-sm text-muted-foreground">
                      Check if your email settings are configured correctly.
                    </p>
                    <Button
                      onClick={() => verifyConfigMutation.mutate()}
                      variant="outline"
                      className="flex items-center"
                      disabled={verifyConfigMutation.isPending}
                    >
                      {verifyConfigMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Verify Configuration
                    </Button>
                  </div>

                  <div className="pt-4 border-t space-y-2">
                    <h3 className="text-lg font-medium">Send Test Email</h3>
                    <p className="text-sm text-muted-foreground">
                      Send a test email to verify your configuration is working properly.
                    </p>
                    <div className="flex space-x-2">
                      <Input
                        placeholder="recipient@example.com"
                        value={testRecipient}
                        onChange={(e) => setTestRecipient(e.target.value)}
                      />
                      <Button
                        onClick={handleSendTestEmail}
                        disabled={sendTestEmailMutation.isPending}
                      >
                        {sendTestEmailMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Mail className="mr-2 h-4 w-4" />
                        )}
                        Send Test
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="help" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Email Configuration Guide</CardTitle>
                  <CardDescription>
                    Learn how to set up and test your email integration
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                      <AccordionTrigger>What is SendGrid?</AccordionTrigger>
                      <AccordionContent>
                        <p className="mb-2">
                          SendGrid is a cloud-based email service that provides reliable delivery of 
                          transactional and marketing emails. Our system uses SendGrid to send:
                        </p>
                        <ul className="list-disc pl-6 space-y-1">
                          <li>Monthly assignment notifications to musicians</li>
                          <li>Contract confirmation emails</li>
                          <li>System notifications to administrators</li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-2">
                      <AccordionTrigger>How to get a SendGrid API Key</AccordionTrigger>
                      <AccordionContent>
                        <ol className="list-decimal pl-6 space-y-2">
                          <li>Sign up for a SendGrid account at <a href="https://sendgrid.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline">sendgrid.com</a>. They offer a free tier with 100 emails/day.</li>
                          <li>After signing up, navigate to Settings → API Keys in your SendGrid dashboard.</li>
                          <li>Click "Create API Key" and choose "Full Access" or customize permissions (at minimum, enable "Mail Send" permissions).</li>
                          <li>Give your key a name like "VAMP Musician Management" and click "Create & View".</li>
                          <li>Copy the displayed API key and paste it into the "SendGrid API Key" field in our settings.</li>
                          <li>Remember to save your key securely, as SendGrid will only show it once.</li>
                        </ol>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-3">
                      <AccordionTrigger>Setting up a verified sender</AccordionTrigger>
                      <AccordionContent>
                        <p className="mb-2">SendGrid requires you to verify the email address you'll be sending from:</p>
                        <ol className="list-decimal pl-6 space-y-2">
                          <li>In your SendGrid dashboard, go to Settings → Sender Authentication.</li>
                          <li>You can either verify a single sender email or set up domain authentication for your organization.</li>
                          <li>For single sender verification, click "Verify a Single Sender" and follow the steps.</li>
                          <li>For domain authentication (recommended for organizations), click "Domain Authentication" and follow the DNS setup instructions.</li>
                          <li>Once verified, enter the email address in the "Sender Email Address" field in our settings.</li>
                        </ol>
                        <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                          <p className="text-sm font-medium flex items-center">
                            <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2" />
                            Important:
                          </p>
                          <p className="text-sm mt-1">
                            You must use a verified sender email address, or your emails may be rejected or marked as spam.
                          </p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-4">
                      <AccordionTrigger>Testing your email configuration</AccordionTrigger>
                      <AccordionContent>
                        <p className="mb-2">After setting up your SendGrid integration, it's important to test it:</p>
                        <ol className="list-decimal pl-6 space-y-2">
                          <li>First, save your email settings with your API key and sender information.</li>
                          <li>Go to the "Testing" tab in the email settings page.</li>
                          <li>Click "Verify Configuration" to check if your settings are valid.</li>
                          <li>Enter your own email address in the test field and click "Send Test" to receive a test email.</li>
                          <li>Check your inbox (and spam folder) to ensure the test email was received correctly.</li>
                        </ol>
                        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                          <p className="text-sm font-medium flex items-center">
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                            Best practice:
                          </p>
                          <p className="text-sm mt-1">
                            Always test your email configuration before finalizing and sending musician assignments.
                          </p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-5">
                      <AccordionTrigger>Troubleshooting email issues</AccordionTrigger>
                      <AccordionContent>
                        <p className="mb-2">If you encounter problems with sending emails:</p>
                        <ul className="list-disc pl-6 space-y-2">
                          <li><strong>API key errors:</strong> Ensure your SendGrid API key is entered correctly and has not expired. API keys are case-sensitive.</li>
                          <li><strong>Sender verification issues:</strong> Check that your sender email address has been verified in SendGrid.</li>
                          <li><strong>Emails not being received:</strong> Check spam/junk folders, and verify your SendGrid account is not suspended.</li>
                          <li><strong>Rate limiting:</strong> The free SendGrid plan allows 100 emails/day. Consider upgrading if you need to send more.</li>
                          <li><strong>Check SendGrid dashboard:</strong> Login to your SendGrid account and check the Activity feed to see the status of sent emails.</li>
                        </ul>
                        <p className="mt-2">
                          If problems persist, visit the <a href="https://sendgrid.com/docs" target="_blank" rel="noopener noreferrer" className="text-primary underline">SendGrid documentation</a> or contact their support.
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}