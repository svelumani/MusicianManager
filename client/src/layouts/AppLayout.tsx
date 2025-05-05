import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  BarChart, Users, Music, Building, Calendar, 
  DollarSign, PieChart, Tag, Menu, Bell, LogOut,
  CalendarRange, Settings, CalendarDays, CalendarClock,
  FileText, CheckCircle
} from "lucide-react";
import vampLogoPath from "@assets/VAMP_Logo_Blue-PNG.webp";

type SidebarItem = {
  label: string;
  path: string;
  icon: ReactNode;
  subItems?: SidebarItem[];
};

const sidebarItems: SidebarItem[] = [
  { label: "Dashboard", path: "/", icon: <BarChart className="mr-3 h-5 w-5" /> },
  { label: "Venues", path: "/venues", icon: <Building className="mr-3 h-5 w-5" /> },
  { label: "Musicians", path: "/musicians", icon: <Music className="mr-3 h-5 w-5" /> },
  { label: "Events", path: "/events", icon: <Calendar className="mr-3 h-5 w-5" /> },
  { 
    label: "Monthly Management", 
    path: "/monthly", 
    icon: <CalendarRange className="mr-3 h-5 w-5" />,
    subItems: [
      { label: "Monthly Planner", path: "", icon: <CalendarDays className="mr-3 h-5 w-5" /> },
      { label: "Monthly Contracts", path: "/contracts", icon: <FileText className="mr-3 h-5 w-5" /> },
      { label: "Contract Status", path: "/status", icon: <CheckCircle className="mr-3 h-5 w-5" /> },
    ]
  },
  { label: "Payments", path: "/payments", icon: <DollarSign className="mr-3 h-5 w-5" /> },
  { label: "Reports", path: "/reports", icon: <PieChart className="mr-3 h-5 w-5" /> },
  { label: "Categories", path: "/categories", icon: <Tag className="mr-3 h-5 w-5" /> },
  { label: "Settings", path: "/settings", icon: <Settings className="mr-3 h-5 w-5" /> },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  // Close mobile sidebar when navigating
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location]);

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center h-screen w-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden flex">
      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <div className={`${isMobileSidebarOpen ? 'fixed inset-y-0 left-0 z-30' : 'hidden'} md:flex md:flex-shrink-0 md:relative`}>
        <div className="flex flex-col w-64 bg-gray-800">
          <div className="flex items-center justify-center h-20 px-4 bg-gray-900">
            <div className="flex flex-col items-center">
              <img 
                src={vampLogoPath}
                alt="Vamp Productions Logo"
                className="h-12 w-auto"
              />
              <span className="text-white text-xs mt-1">Productions</span>
            </div>
          </div>
          <div className="h-0 flex-1 flex flex-col overflow-y-auto">
            {/* Sidebar Navigation */}
            <nav className="mt-5 px-2 space-y-1">
              {sidebarItems.map((item) => (
                <div key={item.path} className="mb-2">
                  <Link href={item.path}
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-md group ${
                      location === item.path || (item.subItems && item.subItems.some(subItem => location === item.path + subItem.path))
                        ? 'text-white bg-primary-600' 
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                  
                  {/* SubItems menu for large, clear navigation */}
                  {item.subItems && (
                    <div className="ml-8 mt-2 space-y-1">
                      {item.subItems.map((subItem) => (
                        <Link key={item.path + subItem.path} 
                          href={item.path + subItem.path}
                          className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                            location === item.path + subItem.path
                              ? 'text-white bg-primary-500'
                              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                          }`}
                        >
                          <span className="mr-2 h-5 w-5">{subItem.icon}</span>
                          <span className="text-base">{subItem.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </div>
          <div className="p-4 border-t border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Avatar>
                  {user.profileImage ? (
                    <AvatarImage src={user.profileImage} alt={user.name} />
                  ) : (
                    <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                  )}
                </Avatar>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-white">
                  {user.name}
                </p>
                <button
                  onClick={() => logout()}
                  className="text-xs font-medium text-gray-300 hover:text-gray-200 flex items-center mt-1"
                >
                  <LogOut className="h-3 w-3 mr-1" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="bg-white shadow-sm z-10">
          <div className="px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-gray-500"
                onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              >
                <Menu className="h-6 w-6" />
              </Button>
              <h1 className="ml-3 md:ml-0 text-xl font-semibold text-gray-900">
                {sidebarItems.find(item => item.path === location)?.label || "Dashboard"}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" className="text-gray-500">
                <Bell className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-500 md:hidden"
                onClick={() => logout()}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
