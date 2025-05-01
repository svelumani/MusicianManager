import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Music, Tag, User, CreditCard, Clock, Mail } from "lucide-react";

const settingsSections = [
  {
    id: "instrument-manager",
    title: "Instrument & Category Manager",
    description: "Manage musical categories and their associated instruments",
    icon: <Music className="h-8 w-8" />,
    color: "text-blue-500 bg-blue-100",
  },
  {
    id: "email",
    title: "Email Settings",
    description: "Configure email notifications for musicians and venues",
    icon: <Mail className="h-8 w-8" />,
    color: "text-red-500 bg-red-100",
  },
  {
    id: "musician-types",
    title: "Musician Types",
    description: "Configure types of musicians available in the system",
    icon: <User className="h-8 w-8" />,
    color: "text-green-500 bg-green-100",
    comingSoon: true,
  },
  {
    id: "payment-settings",
    title: "Payment Settings",
    description: "Configure payment methods and financial settings",
    icon: <CreditCard className="h-8 w-8" />,
    color: "text-purple-500 bg-purple-100",
    comingSoon: true,
  },
  {
    id: "availability-defaults",
    title: "Availability Settings",
    description: "Set default time slots for musician availability",
    icon: <Clock className="h-8 w-8" />,
    color: "text-orange-500 bg-orange-100",
    comingSoon: true,
  }
];

export default function SettingsPage() {

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Configure system-wide settings and manage reference data
          </p>
        </div>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="mb-4">
          <TabsTrigger value="general">General Settings</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="mt-0">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {settingsSections.map((section) => (
              <Card 
                key={section.id} 
                className={section.comingSoon ? "opacity-60" : "hover:shadow-md transition-shadow cursor-pointer"}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg ${section.color}`}>
                      {section.icon}
                    </div>
                    {section.comingSoon && (
                      <span className="text-xs bg-gray-100 text-gray-800 rounded-full px-2 py-1">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <CardTitle className="mt-2">{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {section.comingSoon ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled
                    >
                      Coming Soon
                    </Button>
                  ) : (
                    <Link href={`/settings/${section.id}`}>
                      <Button
                        variant="default"
                        className="w-full"
                      >
                        Manage
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>
                These settings are for advanced users with technical knowledge
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">Advanced settings will be added in a future update.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}