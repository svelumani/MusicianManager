import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Mail, Send, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';

// Email settings schema
const emailSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  from: z.string().email().min(1, "From email is required"),
  replyTo: z.string().email().optional().or(z.literal('')),
  apiKey: z.string().optional().or(z.literal('')),
});

type EmailSettingsFormValues = z.infer<typeof emailSettingsSchema>;

// Test email schema
const testEmailSchema = z.object({
  to: z.string().email().min(1, "Recipient email is required"),
  subject: z.string().min(1, "Subject is required"),
  content: z.string().min(1, "Content is required"),
});

type TestEmailFormValues = z.infer<typeof testEmailSchema>;

// Define settings interface
interface EmailSettings {
  enabled?: boolean;
  from?: string;
  replyTo?: string;
  apiKey?: string;
}

export default function EmailSettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('settings');
  
  // Email settings form
  const form = useForm<EmailSettingsFormValues>({
    resolver: zodResolver(emailSettingsSchema),
    defaultValues: {
      enabled: false,
      from: '',
      replyTo: '',
      apiKey: '',
    }
  });
  
  // Test email form
  const testEmailForm = useForm<TestEmailFormValues>({
    resolver: zodResolver(testEmailSchema),
    defaultValues: {
      to: '',
      subject: 'Test Email from VAMP Platform',
      content: 'This is a test email sent from the VAMP Platform to verify email settings.',
    }
  });
  
  // Fetch email settings
  const { data: settings, isLoading } = useQuery<EmailSettings>({
    queryKey: ['/api/settings/email/config']
  });
  
  // Update form when settings are loaded
  useEffect(() => {
    if (settings) {
      form.reset({
        enabled: settings.enabled || false,
        from: settings.from || '',
        replyTo: settings.replyTo || '',
        apiKey: settings.apiKey ? '••••••••••••••••••••••' : '',
      });
    }
  }, [settings, form]);
  
  // Save email settings
  const saveSettingsMutation = useMutation({
    mutationFn: async (values: EmailSettingsFormValues) => {
      // If apiKey is masked (••••••••••••••••••••••), don't send it
      if (values.apiKey === '••••••••••••••••••••••') {
        values.apiKey = '';
      }
      
      const response = await apiRequest("PUT", "/api/settings/email/config", values);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/email/config'] });
      toast({
        title: "Email settings saved",
        description: "Your email settings have been updated successfully",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save settings",
        description: error?.message || "An error occurred. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Send test email
  const sendTestEmailMutation = useMutation({
    mutationFn: async (values: TestEmailFormValues) => {
      const response = await apiRequest("POST", "/api/settings/email/test", values);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Test email sent",
          description: "The test email was sent successfully. Please check your inbox.",
          variant: "default",
        });
      } else {
        toast({
          title: "Failed to send test email",
          description: data.message || "The email could not be sent. Please check your settings.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send test email",
        description: error?.message || "An error occurred. Please check your settings and try again.",
        variant: "destructive",
      });
    }
  });
  
  // Handle email settings form submission
  const onSubmit = (values: EmailSettingsFormValues) => {
    saveSettingsMutation.mutate(values);
  };
  
  // Handle test email form submission
  const onSendTestEmail = (values: TestEmailFormValues) => {
    sendTestEmailMutation.mutate(values);
  };
  
  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Email Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure email settings for sending notifications to musicians
        </p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="settings">
            <Save className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="test">
            <Send className="h-4 w-4 mr-2" />
            Test Email
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Email Configuration</CardTitle>
              <CardDescription>
                Configure the SendGrid email service to enable sending notifications to musicians
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="flex items-center space-x-2">
                      <FormField
                        control={form.control}
                        name="enabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Enable Email Notifications
                              </FormLabel>
                              <FormDescription>
                                When enabled, the system will send email notifications to musicians
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
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="from"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>From Email Address</FormLabel>
                          <FormControl>
                            <Input placeholder="noreply@yourcompany.com" {...field} />
                          </FormControl>
                          <FormDescription>
                            The email address that will appear as the sender
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="replyTo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reply-To Email Address (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="support@yourcompany.com" {...field} />
                          </FormControl>
                          <FormDescription>
                            Optional email address to receive replies
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="apiKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SendGrid API Key</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder={field.value ? '••••••••••••••••••••••' : 'Enter your SendGrid API key'} 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Your SendGrid API key (leave blank to keep existing key)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Alert className="mt-4">
                      <Mail className="h-4 w-4" />
                      <AlertTitle>SendGrid Required</AlertTitle>
                      <AlertDescription>
                        You need a SendGrid account and API key to send emails. Visit 
                        <a 
                          href="https://sendgrid.com" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary font-medium mx-1"
                        >
                          SendGrid
                        </a> 
                        to create an account and obtain an API key.
                      </AlertDescription>
                    </Alert>
                    
                    <Button 
                      type="submit" 
                      disabled={saveSettingsMutation.isPending}
                      className="w-full sm:w-auto"
                    >
                      {saveSettingsMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Settings
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="test">
          <Card>
            <CardHeader>
              <CardTitle>Send Test Email</CardTitle>
              <CardDescription>
                Send a test email to verify your email configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!(settings && settings.enabled) ? (
                <Alert variant="destructive" className="mb-4">
                  <X className="h-4 w-4" />
                  <AlertTitle>Email Not Configured</AlertTitle>
                  <AlertDescription>
                    Email notifications are disabled. Please enable them in the Settings tab and provide a valid SendGrid API key.
                  </AlertDescription>
                </Alert>
              ) : (
                <Form {...testEmailForm}>
                  <form onSubmit={testEmailForm.handleSubmit(onSendTestEmail)} className="space-y-6">
                    <FormField
                      control={testEmailForm.control}
                      name="to"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recipient Email</FormLabel>
                          <FormControl>
                            <Input placeholder="your@email.com" {...field} />
                          </FormControl>
                          <FormDescription>
                            The email address that will receive the test email
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={testEmailForm.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={testEmailForm.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Content</FormLabel>
                          <FormControl>
                            <Textarea
                              rows={4}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      disabled={sendTestEmailMutation.isPending || !(settings && settings.enabled)}
                      className="w-full sm:w-auto"
                    >
                      {sendTestEmailMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Send Test Email
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}