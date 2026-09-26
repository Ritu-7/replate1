import React, { useState } from "react";
import {
  User,
  Bell,
  Lock,
  Globe,
  Sliders,
  CheckCircle2,
  KeyRound,
  Shield,
  Smartphone,
  Mail,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import DashboardLayout from "../../components/layout/DashboardLayout";
import {
  PageHeader,
  Card,
  Button,
  Input,
  Select,
} from "../../components/common";

const SettingsPage = () => {
  const { currentUser, resetPassword } = useAuth();

  // Settings Toggles State
  const [notifications, setNotifications] = useState({
    smsAlerts: true,
    emailDigest: true,
    pushNotifications: false,
    surplusNearMe: true,
  });

  const [privacy, setPrivacy] = useState({
    publicDirectory: true,
    showPhone: true,
    shareImpactStats: true,
  });

  const [preferences, setPreferences] = useState({
    defaultCity: "Noida",
    distanceUnit: "km",
    maxRadius: "5",
  });

  const [isResetSending, setIsResetSending] = useState(false);
  const [resetFeedback, setResetFeedback] = useState("");
  const [saveFeedback, setSaveFeedback] = useState("");

  const handleResetPasswordClick = async () => {
    if (!currentUser?.email) return;
    try {
      setIsResetSending(true);
      await resetPassword(currentUser.email);
      setResetFeedback(`Password reset link sent to ${currentUser.email}!`);
      setTimeout(() => setResetFeedback(""), 5000);
    } catch (err) {
      setResetFeedback("Failed to send reset link. Try again later.");
    } finally {
      setIsResetSending(false);
    }
  };

  const handleSaveSettings = () => {
    setSaveFeedback("Settings saved successfully!");
    setTimeout(() => setSaveFeedback(""), 4000);
  };

  const content = (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Page Header */}
      <PageHeader
        title="Application Settings"
        subtitle="Manage account security, alert preferences, privacy controls, and regional defaults."
        actions={
          <Button
            variant="primary"
            iconLeft={CheckCircle2}
            onClick={handleSaveSettings}
          >
            Save All Preferences
          </Button>
        }
      />

      {/* Global Save Feedback */}
      {saveFeedback && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveFeedback}</span>
        </div>
      )}

      <div className="space-y-8">
        {/* 1. ACCOUNT SECURITY SECTION */}
        <Card variant="default">
          <div className="flex items-center gap-2 pb-4 mb-4 border-b border-charcoal-100">
            <Lock className="w-5 h-5 text-brand-600" />
            <div>
              <Card.Title className="text-base">
                1. Account & Security
              </Card.Title>
              <Card.Description>
                Manage authentication and password security
              </Card.Description>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-surface-50 rounded-2xl border border-charcoal-100 gap-3">
              <div>
                <p className="font-bold text-charcoal-900 text-sm">
                  Primary Email Address
                </p>
                <p className="text-charcoal-600 mt-0.5">
                  {currentUser?.email || "partner@replate.org"}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold self-start sm:self-auto">
                <CheckCircle2 className="w-3.5 h-3.5" /> Verified Email
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-surface-50 rounded-2xl border border-charcoal-100 gap-3">
              <div>
                <p className="font-bold text-charcoal-900 text-sm">
                  Password Security
                </p>
                <p className="text-charcoal-600 mt-0.5">
                  Send a Firebase password reset email
                </p>
                {resetFeedback && (
                  <p className="text-emerald-700 font-bold mt-1">
                    {resetFeedback}
                  </p>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                iconLeft={KeyRound}
                isLoading={isResetSending}
                onClick={handleResetPasswordClick}
              >
                Reset Password
              </Button>
            </div>
          </div>
        </Card>

        {/* 2. NOTIFICATIONS SECTION */}
        <Card variant="default">
          <div className="flex items-center gap-2 pb-4 mb-4 border-b border-charcoal-100">
            <Bell className="w-5 h-5 text-brand-600" />
            <div>
              <Card.Title className="text-base">
                2. Notifications & Surplus Alerts
              </Card.Title>
              <Card.Description>
                Configure how and when you receive food recovery alerts
              </Card.Description>
            </div>
          </div>

          <div className="space-y-4">
            {[
              {
                key: "smsAlerts",
                title: "Instant SMS Alerts for Nearby Food",
                desc: "Receive SMS as soon as commercial kitchens post surplus within your pickup radius.",
                icon: Smartphone,
              },
              {
                key: "emailDigest",
                title: "Monthly Environmental Impact Summary",
                desc: "Email reports covering carbon offset, meals rescued, and ESG compliance.",
                icon: Mail,
              },
              {
                key: "surplusNearMe",
                title: "Real-Time Proximity Matching",
                desc: "Match listings within a 5km radius of Noida Sector 62 automatically.",
                icon: Bell,
              },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between p-4 bg-surface-50 rounded-2xl border border-charcoal-100"
              >
                <div className="flex items-start gap-3 pr-4">
                  <item.icon className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-charcoal-900 text-sm">
                      {item.title}
                    </p>
                    <p className="text-xs text-charcoal-500 mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                </div>

                {/* Accessible Toggle Switch */}
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={notifications[item.key]}
                    onChange={(e) =>
                      setNotifications({
                        ...notifications,
                        [item.key]: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-charcoal-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-charcoal-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600" />
                </label>
              </div>
            ))}
          </div>
        </Card>

        {/* 3. PRIVACY SECTION */}
        <Card variant="default">
          <div className="flex items-center gap-2 pb-4 mb-4 border-b border-charcoal-100">
            <Shield className="w-5 h-5 text-brand-600" />
            <div>
              <Card.Title className="text-base">
                3. Privacy & Directory Controls
              </Card.Title>
              <Card.Description>
                Manage organization visibility across the RePlate network
              </Card.Description>
            </div>
          </div>

          <div className="space-y-4">
            {[
              {
                key: "publicDirectory",
                title: "List in Verified Partner Directory",
                desc: "Allow verified recipient NGOs or commercial donors to discover your profile.",
              },
              {
                key: "showPhone",
                title: "Display Contact Phone for Scheduled Pickups",
                desc: "Show phone number only during confirmed food claim pickup windows.",
              },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between p-4 bg-surface-50 rounded-2xl border border-charcoal-100"
              >
                <div className="pr-4">
                  <p className="font-bold text-charcoal-900 text-sm">
                    {item.title}
                  </p>
                  <p className="text-xs text-charcoal-500 mt-0.5">
                    {item.desc}
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={privacy[item.key]}
                    onChange={(e) =>
                      setPrivacy({ ...privacy, [item.key]: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-charcoal-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-charcoal-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600" />
                </label>
              </div>
            ))}
          </div>
        </Card>

        {/* 4. APPLICATION PREFERENCES SECTION */}
        <Card variant="default">
          <div className="flex items-center gap-2 pb-4 mb-4 border-b border-charcoal-100">
            <Sliders className="w-5 h-5 text-brand-600" />
            <div>
              <Card.Title className="text-base">
                4. Regional & Application Preferences
              </Card.Title>
              <Card.Description>
                Default location settings and units
              </Card.Description>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Primary Region"
              value={preferences.defaultCity}
              onChange={(e) =>
                setPreferences({ ...preferences, defaultCity: e.target.value })
              }
              options={["Noida", "Greater Noida", "Delhi NCR", "Gurugram"]}
            />

            <Select
              label="Distance Unit"
              value={preferences.distanceUnit}
              onChange={(e) =>
                setPreferences({ ...preferences, distanceUnit: e.target.value })
              }
              options={[
                { value: "km", label: "Kilometers (km)" },
                { value: "miles", label: "Miles (mi)" },
              ]}
            />

            <Select
              label="Default Search Radius"
              value={preferences.maxRadius}
              onChange={(e) =>
                setPreferences({ ...preferences, maxRadius: e.target.value })
              }
              options={[
                { value: "2", label: "2 km" },
                { value: "5", label: "5 km" },
                { value: "10", label: "10 km" },
                { value: "20", label: "20 km" },
              ]}
            />
          </div>
        </Card>
      </div>
    </div>
  );

  if (currentUser) {
    return <DashboardLayout title="Settings">{content}</DashboardLayout>;
  }

  return content;
};

export default SettingsPage;
