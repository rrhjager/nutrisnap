import React, { useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { motion } from 'motion/react';
import { User, LogOut, Target, ChevronRight, Save, ShieldAlert, Crown, Check, Sparkles, Activity, Flame, Award, Camera } from 'lucide-react';
import { UserProfile } from '../types';
import { AdBanner } from './AdBanner';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export const Profile: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isFitConnected, setIsFitConnected] = useState(false);

  useEffect(() => {
    setIsFitConnected(!!sessionStorage.getItem('googleFitToken'));
  }, []);
  const [goals, setGoals] = useState({
    dailyCalorieGoal: 2000,
    dailyProteinGoal: 150,
    dailyCarbsGoal: 200,
    dailyFatGoal: 70,
  });
  const [loading, setLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{
    title: string;
    message: string;
    actionText?: string;
    onAction?: () => void;
  } | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const profileRef = doc(db, 'users', auth.currentUser.uid);
    const unsubscribe = onSnapshot(profileRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setProfile(data);
        setGoals({
          dailyCalorieGoal: data.dailyCalorieGoal || 2000,
          dailyProteinGoal: data.dailyProteinGoal || 150,
          dailyCarbsGoal: data.dailyCarbsGoal || 200,
          dailyFatGoal: data.dailyFatGoal || 70,
        });
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${auth.currentUser?.uid}`));

    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    auth.signOut();
  };

  const handleSaveGoals = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), goals);
      setIsEditing(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!auth.currentUser) return;

    if (profile?.isGuest) {
      setAlertMessage({
        title: "Login Required",
        message: "Please log in with a Google account to upgrade to Premium. Guest accounts cannot be upgraded because their data is temporary.",
        actionText: "Go to Login",
        onAction: () => {
          auth.signOut();
        }
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: auth.currentUser.uid }),
      });

      const data = await response.json();
      if (data.url) {
        // Stripe Checkout blocks iframes, so we must open it in a new tab
        const checkoutWindow = window.open(data.url, '_blank');
        if (!checkoutWindow) {
          setAlertMessage({
            title: "Popup Blocked",
            message: "Please allow popups for this site to open the checkout page."
          });
        }
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (err: any) {
      console.error('Upgrade Error:', err);
      setAlertMessage({
        title: "Upgrade Failed",
        message: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="space-y-6 pb-12">
      <header className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-zinc-900">Profile</h2>
        <button 
          onClick={handleLogout}
          className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
        >
          <LogOut className="w-6 h-6" />
        </button>
      </header>

      {/* Premium Upgrade Card */}
      {!profile.isPremium && (
        <div className="bg-zinc-900 rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-amber-400 p-2 rounded-xl">
                <Crown className="w-5 h-5 text-zinc-900 fill-zinc-900" />
              </div>
              <h3 className="text-xl font-bold text-white">NutriSnap Premium</h3>
            </div>
            
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
              Get unlimited access to all features for just <span className="text-white font-bold">€2.99 / month</span>.
            </p>

            <ul className="space-y-3 mb-8">
              <PremiumFeature text="Unlimited meal scanning" />
              <PremiumFeature text="No ads" />
              <PremiumFeature text="Detailed weekly charts" />
              <PremiumFeature text="Connect with Health apps" />
            </ul>

            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full bg-amber-400 text-zinc-900 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <Sparkles className="w-5 h-5" />
              Upgrade Now
            </button>
          </div>
          <Crown className="absolute -right-8 -bottom-8 w-48 h-48 text-white/5 rotate-12" />
        </div>
      )}

      {/* Premium Benefits Card (Visible only to Premium users) */}
      {profile.isPremium && (
        <div className="bg-zinc-900 rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-amber-400 p-2 rounded-xl shadow-lg shadow-amber-900/20">
                <Crown className="w-5 h-5 text-zinc-900 fill-zinc-900" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Premium Benefits</h3>
                <p className="text-amber-400 text-[10px] font-bold uppercase tracking-widest">Active Subscription</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
                <Check className="w-4 h-4 text-emerald-400 mb-2" />
                <h4 className="text-white text-xs font-bold mb-1">Unlimited Scans</h4>
                <p className="text-zinc-500 text-[10px]">Up to 150 scans/day</p>
              </div>
              <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
                <Check className="w-4 h-4 text-emerald-400 mb-2" />
                <h4 className="text-white text-xs font-bold mb-1">Weekly Trends</h4>
                <p className="text-zinc-500 text-[10px]">Detailed macro charts</p>
              </div>
              <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
                <Check className="w-4 h-4 text-emerald-400 mb-2" />
                <h4 className="text-white text-xs font-bold mb-1">No Ads</h4>
                <p className="text-zinc-500 text-[10px]">Clean experience</p>
              </div>
              <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
                <Check className="w-4 h-4 text-emerald-400 mb-2" />
                <h4 className="text-white text-xs font-bold mb-1">Health Sync</h4>
                <p className="text-zinc-500 text-[10px]">Google Fit & more</p>
              </div>
            </div>
          </div>
          <Crown className="absolute -right-8 -bottom-8 w-48 h-48 text-white/5 rotate-12" />
        </div>
      )}

      {!profile.isPremium && (
        <div className="mt-8">
          <AdBanner type="banner" />
        </div>
      )}

      {/* User Info Card */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-zinc-100 flex items-center gap-6">
        <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center text-emerald-600 overflow-hidden relative">
          {profile.photoURL ? (
            <img src={profile.photoURL} alt={profile.displayName} className="w-full h-full object-cover" />
          ) : (
            <User className="w-10 h-10" />
          )}
          {profile.isPremium && (
            <div className="absolute -top-1 -right-1 bg-amber-400 p-1 rounded-full border-2 border-white">
              <Crown className="w-3 h-3 text-white fill-white" />
            </div>
          )}
        </div>
        <div>
          <h3 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
            {profile.displayName || 'Guest'}
            {profile.isPremium && <Crown className="w-4 h-4 text-amber-500 fill-amber-500" />}
          </h3>
          <p className="text-zinc-500 text-sm">{profile.email || 'Guest Account'}</p>
          <div className="flex gap-2 mt-2">
            {profile.isGuest && (
              <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[10px] font-bold uppercase tracking-wider rounded-md border border-amber-100">
                Guest
              </span>
            )}
            {profile.isPremium && (
              <span className="px-3 py-1 bg-amber-400 text-zinc-900 text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm flex items-center gap-1">
                <Crown className="w-3 h-3 fill-zinc-900" />
                Premium Member
              </span>
            )}
            {!profile.isPremium && (
              <button 
                onClick={() => window.location.reload()}
                className="px-2 py-0.5 bg-zinc-100 text-zinc-500 text-[10px] font-bold uppercase tracking-wider rounded-md border border-zinc-200 hover:bg-zinc-200 transition-colors"
              >
                Refresh Status
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats & Badges Card */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-zinc-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-orange-100 p-2 rounded-xl text-orange-500">
            <Flame className="w-5 h-5 fill-orange-500" />
          </div>
          <h3 className="text-xl font-bold text-zinc-900">Stats & Badges</h3>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Current Streak</p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-zinc-900">{profile.currentStreak || 0}</span>
              <span className="text-zinc-500 font-medium mb-1">days</span>
            </div>
          </div>
          <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Total Scans</p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-zinc-900">{profile.totalScans || 0}</span>
              <span className="text-zinc-500 font-medium mb-1">meals</span>
            </div>
          </div>
        </div>

        <div>
          <p className="text-zinc-900 font-bold mb-4">Unlocked Badges</p>
          <div className="grid grid-cols-4 gap-4">
            {[
              { id: 'first_scan', label: '1st Scan', icon: <Camera className="w-5 h-5" /> },
              { id: 'ten_scans', label: '10 Scans', icon: <Target className="w-5 h-5" /> },
              { id: 'fifty_scans', label: '50 Scans', icon: <Award className="w-5 h-5" /> },
              { id: 'hundred_scans', label: '100 Scans', icon: <Crown className="w-5 h-5" /> },
            ].map(badge => {
              const isUnlocked = profile.unlockedBadges?.includes(badge.id);
              return (
                <div key={badge.id} className="flex flex-col items-center gap-2">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                    isUnlocked 
                      ? 'bg-amber-100 text-amber-500 shadow-inner border-2 border-amber-200' 
                      : 'bg-zinc-100 text-zinc-300 border-2 border-zinc-200 border-dashed'
                  }`}>
                    {badge.icon}
                  </div>
                  <span className={`text-[10px] font-bold text-center ${isUnlocked ? 'text-zinc-900' : 'text-zinc-400'}`}>
                    {badge.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Debug Section for User */}
      {profile.email === 'RRHJager@gmail.com' && (
        <div className="bg-zinc-900 rounded-[2.5rem] p-8 text-white font-mono text-[10px] overflow-auto max-h-60 shadow-xl border border-zinc-800">
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <span className="text-zinc-400 font-bold uppercase tracking-widest">System Debug Console</span>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-emerald-400 transition-colors"
            >
              RELOAD APP
            </button>
          </div>
          <pre className="no-scrollbar">{JSON.stringify({
            uid: profile.uid,
            email: profile.email,
            isPremium: profile.isPremium,
            stripeCustomerId: profile.stripeCustomerId ? 'SET' : 'MISSING',
            stripeSubscriptionId: profile.stripeSubscriptionId ? 'SET' : 'MISSING',
            scansToday: profile.scansToday,
            lastScanDate: profile.lastScanDate,
            dailyCalorieGoal: profile.dailyCalorieGoal,
            dailyProteinGoal: profile.dailyProteinGoal,
            dailyCarbsGoal: profile.dailyCarbsGoal,
            dailyFatGoal: profile.dailyFatGoal
          }, null, 2)}</pre>
        </div>
      )}

      {/* Google Fit Connection Card */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-zinc-100">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${isFitConnected ? 'bg-blue-50' : 'bg-zinc-50'}`}>
              <Activity className={`w-5 h-5 ${isFitConnected ? 'text-blue-600' : 'text-zinc-400'}`} />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900">Google Fit</h3>
              <p className="text-zinc-500 text-xs">
                {isFitConnected ? 'Connected & Syncing' : 'Not Connected'}
              </p>
            </div>
          </div>
          {isFitConnected ? (
            <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold uppercase tracking-wider">
              <Check className="w-4 h-4" />
              Active
            </div>
          ) : (
            <p className="text-zinc-400 text-xs leading-tight text-right max-w-[120px]">
              Log in with Google to sync your meals.
            </p>
          )}
        </div>
      </div>

      {/* Goals Section */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-zinc-100 space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-50 p-2 rounded-xl">
              <Target className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="font-bold text-zinc-900">Daily Goals</h3>
          </div>
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className="text-emerald-500 font-bold text-sm"
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </button>
        </div>

        <div className="space-y-4">
          <GoalItem 
            label="Calories" 
            value={goals.dailyCalorieGoal} 
            unit="kcal" 
            isEditing={isEditing}
            onChange={(v) => setGoals({ ...goals, dailyCalorieGoal: parseInt(v) })}
          />
          <GoalItem 
            label="Protein" 
            value={goals.dailyProteinGoal} 
            unit="g" 
            isEditing={isEditing}
            onChange={(v) => setGoals({ ...goals, dailyProteinGoal: parseInt(v) })}
          />
          <GoalItem 
            label="Carbohydrates" 
            value={goals.dailyCarbsGoal} 
            unit="g" 
            isEditing={isEditing}
            onChange={(v) => setGoals({ ...goals, dailyCarbsGoal: parseInt(v) })}
          />
          <GoalItem 
            label="Fat" 
            value={goals.dailyFatGoal} 
            unit="g" 
            isEditing={isEditing}
            onChange={(v) => setGoals({ ...goals, dailyFatGoal: parseInt(v) })}
          />
        </div>

        {isEditing && (
          <button
            onClick={handleSaveGoals}
            disabled={loading}
            className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            Save Goals
          </button>
        )}
      </div>

      {profile.isGuest && (
        <div className="bg-amber-50 rounded-[2rem] p-6 border border-amber-100 flex items-start gap-4">
          <ShieldAlert className="w-6 h-6 text-amber-600 flex-shrink-0" />
          <div>
            <h4 className="font-bold text-amber-900 text-sm">Limited Features</h4>
            <p className="text-amber-700 text-xs leading-relaxed mt-1">
              As a guest, your data is only stored temporarily. Log in with Google to keep your history on all your devices.
            </p>
          </div>
        </div>
      )}

      {/* Logout Button at Bottom */}
      <div className="pt-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl border-2 border-zinc-100 text-zinc-500 font-bold hover:bg-red-50 hover:border-red-100 hover:text-red-600 transition-all active:scale-[0.98]"
        >
          <LogOut className="w-5 h-5" />
          Log Out
        </button>
      </div>

      {alertMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-xl"
          >
            <div className="flex items-center gap-3 mb-4 text-amber-600">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="font-bold text-lg text-zinc-900">{alertMessage.title}</h3>
            </div>
            <p className="text-zinc-600 mb-6 leading-relaxed">{alertMessage.message}</p>
            {alertMessage.actionText ? (
              <div className="flex gap-3">
                <button
                  onClick={() => setAlertMessage(null)}
                  className="flex-1 bg-zinc-100 text-zinc-700 py-3 rounded-xl font-bold active:scale-[0.98] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    alertMessage.onAction?.();
                    setAlertMessage(null);
                  }}
                  className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-bold active:scale-[0.98] transition-all"
                >
                  {alertMessage.actionText}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAlertMessage(null)}
                className="w-full bg-zinc-900 text-white py-3 rounded-xl font-bold active:scale-[0.98] transition-all"
              >
                Got it
              </button>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
};

const PremiumFeature = ({ text }: { text: string }) => (
  <li className="flex items-center gap-3 text-zinc-300 text-sm">
    <div className="bg-emerald-500/20 p-1 rounded-full">
      <Check className="w-3 h-3 text-emerald-400" />
    </div>
    {text}
  </li>
);

const GoalItem = ({ label, value, unit, isEditing, onChange }: { label: string, value: number, unit: string, isEditing: boolean, onChange: (v: string) => void }) => (
  <div className="flex justify-between items-center p-4 bg-zinc-50 rounded-2xl">
    <span className="text-zinc-500 font-medium">{label}</span>
    <div className="flex items-center gap-2">
      {isEditing ? (
        <input 
          type="number" 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          className="w-20 bg-white border border-zinc-200 rounded-lg px-2 py-1 text-right font-bold text-zinc-900 focus:outline-none focus:border-emerald-500"
        />
      ) : (
        <span className="font-bold text-zinc-900">{value}</span>
      )}
      <span className="text-zinc-400 text-xs font-medium">{unit}</span>
    </div>
  </div>
);
