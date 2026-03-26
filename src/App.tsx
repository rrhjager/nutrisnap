import { useState, useEffect } from 'react';
import { CameraView } from './components/CameraView';
import { NutritionDisplay } from './components/NutritionDisplay';
import { LogView } from './components/LogView';
import Login from './components/Login';
import { Profile } from './components/Profile';
import { ManualEntry } from './components/ManualEntry';
import { VoiceCommand } from './components/VoiceCommand';
import { Onboarding } from './components/Onboarding';
import { WaterTracker } from './components/WaterTracker';
import { ErrorModal } from './components/ErrorModal';
import { AdBanner } from './components/AdBanner';
import { SkeletonLoader } from './components/SkeletonLoader';
import { FavoritesModal } from './components/FavoritesModal';
import { analyzeFoodImage, fetchByBarcode, NutritionInfo } from './services/nutritionService';
import { syncMealToGoogleFit } from './services/googleFitService';
import { LogEntry, UserProfile, ScanEntry } from './types';
import { auth, db, onAuthStateChanged, FirebaseUser, handleFirestoreError, OperationType } from './firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Apple, History, Settings, Info, Camera, LogIn, Plus, Moon, Sun, Mic, Heart } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { AdMob } from '@capacitor-community/admob';
import { setupDailyReminder } from './services/notificationService';

type View = 'scan' | 'log' | 'profile';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [activeView, setActiveView] = useState<View>('scan');
  const [nutritionData, setNutritionData] = useState<NutritionInfo | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [scans, setScans] = useState<ScanEntry[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showVoiceCommand, setShowVoiceCommand] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [waterAmount, setWaterAmount] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true' || 
             window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const SCAN_LIMIT = 5; // Limit for free users
  const PREMIUM_SCAN_LIMIT = 150;

  useEffect(() => {
    const initAdMob = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          await AdMob.initialize({
            initializeForTesting: true,
          });
          console.log('AdMob initialized successfully');
        } catch (err) {
          console.error('Failed to initialize AdMob', err);
        }
      }
    };
    initAdMob();
    setupDailyReminder();
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', isDarkMode.toString());
  }, [isDarkMode]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });

    // Handle payment success message from URL (fallback)
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      console.log('[Payment] Success detected in URL params');
      window.history.replaceState({}, document.title, window.location.pathname);
      setSuccessMessage("Welcome to Premium! Your features are now unlocked.");
      
      // Force a profile refresh if we have a user
      if (user) {
        const profileRef = doc(db, 'users', user.uid);
        getDoc(profileRef).then(docSnap => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            console.log(`[Profile] Forced refresh after payment: isPremium=${data.isPremium}`);
            setUserProfile(data);
          }
        });
      }
    }

    // Handle payment success message from popup
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'PAYMENT_SUCCESS') {
        if (event.data.status === 'success') {
          setSuccessMessage("Welcome to Premium! Your features are now unlocked.");
          setTimeout(() => setSuccessMessage(null), 5000);
        } else {
          setError(`Payment successful, but profile update is pending (Status: ${event.data.status}). Please refresh in a moment.`);
        }
      } else if (event.data?.type === 'PAYMENT_CANCEL') {
        setError("Payment was cancelled.");
        setTimeout(() => setError(null), 3000);
      }
    };
    window.addEventListener('message', handleMessage);

    return () => {
      unsubscribe();
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setLogs([]);
      setUserProfile(null);
      setWaterAmount(0);
      return;
    }

    // Helper for guest scan tracking
    const getGuestScanData = () => {
      const today = new Date().toLocaleDateString('en-CA');
      const storedDate = localStorage.getItem('guest_scan_date');
      if (storedDate === today) {
        return parseInt(localStorage.getItem('guest_scan_count') || '0');
      }
      return 0;
    };

    // Fetch user profile for goals and premium status
    const profileRef = doc(db, 'users', user.uid);
    const unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        console.log(`[Profile Update] UID: ${user.uid}, isPremium: ${data.isPremium}, scansToday: ${data.scansToday}`);
        
        // Handle daily scan reset (local date)
        const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
        
        if (data.lastScanDate !== today) {
          const resetScans = data.isGuest ? getGuestScanData() : 0;
          updateDoc(profileRef, {
            scansToday: resetScans,
            lastScanDate: today
          }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`));
        } else if (data.isGuest && getGuestScanData() > (data.scansToday || 0)) {
          // Sync Firestore with localStorage if localStorage is higher (e.g. after logout/login)
          updateDoc(profileRef, {
            scansToday: getGuestScanData()
          }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`));
        }

        setUserProfile(data);
        setWaterAmount(data.waterAmount || 0);

        // Notify user if premium status was just activated
        if (data.isPremium && !userProfile?.isPremium) {
          console.log('[Premium] Status changed to TRUE');
          setSuccessMessage("Premium status activated! Enjoy your new features.");
          setTimeout(() => setSuccessMessage(null), 5000);
        }
      } else {
        // Initialize profile if it doesn't exist
        const today = new Date().toLocaleDateString('en-CA');
        const initialScans = user.isAnonymous ? getGuestScanData() : 0;

        const initialProfile: UserProfile = {
          uid: user.uid,
          displayName: user.isAnonymous ? 'Guest' : (user.displayName || 'User'),
          email: user.email || '',
          photoURL: user.photoURL || '',
          isGuest: user.isAnonymous,
          dailyCalorieGoal: 2000,
          dailyProteinGoal: 150,
          dailyCarbsGoal: 200,
          dailyFatGoal: 70,
          waterAmount: 0,
          scansToday: initialScans,
          lastScanDate: today,
          createdAt: Date.now(),
        };
        console.log(`[Profile] Initializing new profile for ${user.uid}`);
        setDoc(profileRef, initialProfile, { merge: true }).catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`));
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${user.uid}`));

    // Fetch logs
    const logsRef = collection(db, 'users', user.uid, 'meals');
    const unsubscribeLogs = onSnapshot(logsRef, (snapshot) => {
      const newLogs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Convert Firestore Timestamp to number if necessary
          timestamp: data.timestamp?.toMillis ? data.timestamp.toMillis() : (data.timestamp || Date.now())
        };
      }) as LogEntry[];
      // Sort by timestamp descending
      setLogs(newLogs.sort((a, b) => b.timestamp - a.timestamp));
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${user.uid}/meals`));

    // Fetch scans
    const scansRef = collection(db, 'users', user.uid, 'scans');
    const unsubscribeScans = onSnapshot(scansRef, (snapshot) => {
      const newScans = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toMillis ? data.timestamp.toMillis() : (data.timestamp || Date.now())
        };
      }) as ScanEntry[];
      setScans(newScans.sort((a, b) => b.timestamp - a.timestamp));
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${user.uid}/scans`));

    return () => {
      unsubscribeProfile();
      unsubscribeLogs();
      unsubscribeScans();
    };
  }, [user]);

  const handleCapture = async (base64Image: string, isBarcode?: boolean) => {
    if (!user || !userProfile) return;
    if (navigator.vibrate) navigator.vibrate(50);

    // Check scan limit
    const currentLimit = userProfile.isPremium ? PREMIUM_SCAN_LIMIT : SCAN_LIMIT;
    if ((userProfile.scansToday || 0) >= currentLimit) {
      setError(`You've reached your daily limit of ${currentLimit} scans. ${userProfile.isPremium ? 'Please try again tomorrow.' : 'Upgrade to Premium for more scans!'}`);
      return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      const data = await analyzeFoodImage(base64Image, isBarcode);
      
      // Increment scan count even if "Not Food" is detected
      const profileRef = doc(db, 'users', user.uid);
      const today = new Date().toLocaleDateString('en-CA');
      const newCount = (userProfile.scansToday || 0) + 1;

      if (userProfile.isGuest) {
        localStorage.setItem('guest_scan_count', newCount.toString());
        localStorage.setItem('guest_scan_date', today);
      }

      await updateDoc(profileRef, {
        scansToday: newCount,
        lastScanDate: today
      });

      if (data.foodName === "Not Food") {
        setErrorModalMessage("Oops! That doesn't look like food. Please try again.");
        setShowErrorModal(true);
        return;
      }

      setNutritionData(data);

      // Save to scan history
      const scansRef = collection(db, 'users', user.uid, 'scans');
      await addDoc(scansRef, {
        ...data,
        userId: user.uid,
        timestamp: serverTimestamp()
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Analysis failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBarcodeScan = async (barcode: string) => {
    if (!user || !userProfile) return;
    if (navigator.vibrate) navigator.vibrate(50);

    // Check scan limit
    const currentLimit = userProfile.isPremium ? PREMIUM_SCAN_LIMIT : SCAN_LIMIT;
    if ((userProfile.scansToday || 0) >= currentLimit) {
      setError(`You've reached your daily limit of ${currentLimit} scans. ${userProfile.isPremium ? 'Please try again tomorrow.' : 'Upgrade to Premium for more scans!'}`);
      return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      // Increment scan count even if it fails
      const profileRef = doc(db, 'users', user.uid);
      const today = new Date().toLocaleDateString('en-CA');
      const newCount = (userProfile.scansToday || 0) + 1;

      if (userProfile.isGuest) {
        localStorage.setItem('guest_scan_count', newCount.toString());
        localStorage.setItem('guest_scan_date', today);
      }

      await updateDoc(profileRef, {
        scansToday: newCount,
        lastScanDate: today
      });

      const data = await fetchByBarcode(barcode);
      setNutritionData(data);

      // Save to scan history
      const scansRef = collection(db, 'users', user.uid, 'scans');
      await addDoc(scansRef, {
        ...data,
        userId: user.uid,
        timestamp: serverTimestamp()
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Barcode scan failed. Please try taking a photo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVoiceResult = async (data: NutritionInfo) => {
    if (!user || !userProfile) return;
    if (navigator.vibrate) navigator.vibrate(50);

    // Check scan limit
    const currentLimit = userProfile.isPremium ? PREMIUM_SCAN_LIMIT : SCAN_LIMIT;
    if ((userProfile.scansToday || 0) >= currentLimit) {
      setError(`You've reached your daily limit of ${currentLimit} scans. ${userProfile.isPremium ? 'Please try again tomorrow.' : 'Upgrade to Premium for more scans!'}`);
      return;
    }
    
    // Increment scan count
    try {
      const profileRef = doc(db, 'users', user.uid);
      const today = new Date().toLocaleDateString('en-CA');
      const newCount = (userProfile.scansToday || 0) + 1;

      if (userProfile.isGuest) {
        localStorage.setItem('guest_scan_count', newCount.toString());
        localStorage.setItem('guest_scan_date', today);
      }

      await updateDoc(profileRef, {
        scansToday: newCount,
        lastScanDate: today
      });
    } catch (err) {
      console.error('Error incrementing scan count:', err);
    }

    if (data.foodName === "Not Food") {
      setErrorModalMessage("Oops! That doesn't look like food. Please try again.");
      setShowErrorModal(true);
      return;
    }

    setNutritionData(data);

    // Save to scan history
    try {
      const scansRef = collection(db, 'users', user.uid, 'scans');
      await addDoc(scansRef, {
        ...data,
        userId: user.uid,
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error('Error saving scan to history:', err);
    }
  };

  const handleSaveToLog = async (data: NutritionInfo) => {
    if (!user) return;
    if (navigator.vibrate) navigator.vibrate(100);
    try {
      let isSynced = false;
      
      // Sync to Google Fit if token exists
      const googleFitToken = sessionStorage.getItem('googleFitToken');
      if (googleFitToken) {
        try {
          await syncMealToGoogleFit(googleFitToken, data);
          isSynced = true;
        } catch (fitErr) {
          console.warn('Google Fit sync failed, but saving to local log:', fitErr);
        }
      }

      // Destructure to remove potential metadata from previous entries
      const { foodName, calories, protein, carbs, fat, confidence, servingSize, ingredients } = data;

      const newEntry = {
        foodName,
        calories,
        protein,
        carbs,
        fat,
        confidence,
        servingSize,
        ingredients,
        userId: user.uid,
        timestamp: Date.now(),
        isSynced
      };
      const logsRef = collection(db, 'users', user.uid, 'meals');
      await addDoc(logsRef, newEntry);

      // Update streaks and badges
      if (userProfile) {
        const todayStr = new Date().toISOString().split('T')[0];
        let newStreak = userProfile.currentStreak || 0;
        let newLongest = userProfile.longestStreak || 0;
        let newTotal = (userProfile.totalScans || 0) + 1;
        let newBadges = [...(userProfile.unlockedBadges || [])];

        const lastScan = userProfile.lastScanDate;
        
        if (lastScan !== todayStr) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];

          if (lastScan === yesterdayStr) {
            newStreak += 1;
          } else {
            newStreak = 1;
          }
          newLongest = Math.max(newStreak, newLongest);
        }

        const BADGES: Record<number, string> = {
          1: 'first_scan',
          10: 'ten_scans',
          50: 'fifty_scans',
          100: 'hundred_scans'
        };

        if (BADGES[newTotal] && !newBadges.includes(BADGES[newTotal])) {
          newBadges.push(BADGES[newTotal]);
          setSuccessMessage(`New Badge Unlocked: ${BADGES[newTotal].replace('_', ' ').toUpperCase()}!`);
          setTimeout(() => setSuccessMessage(null), 5000);
        }

        await updateDoc(doc(db, 'users', user.uid), {
          totalScans: newTotal,
          currentStreak: newStreak,
          longestStreak: newLongest,
          lastScanDate: todayStr,
          unlockedBadges: newBadges
        });
      }
      
      setNutritionData(null);
      setActiveView('log');
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/meals`);
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'meals', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/meals/${id}`);
    }
  };

  const handleSaveFavorite = async (data: NutritionInfo, customName: string) => {
    if (!user) return;
    try {
      const { foodName, calories, protein, carbs, fat, confidence, servingSize, ingredients } = data;
      const newFavorite = {
        foodName,
        calories,
        protein,
        carbs,
        fat,
        confidence,
        servingSize,
        ingredients,
        customName,
        userId: user.uid,
        createdAt: Date.now()
      };
      const favsRef = collection(db, 'users', user.uid, 'favorites');
      await addDoc(favsRef, newFavorite);
      setSuccessMessage(`Saved "${customName}" to favorites!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error saving favorite:', err);
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/favorites`);
    }
  };

  const handleUpdateWater = async (amount: number) => {
    if (!user) return;
    setWaterAmount(amount);
    try {
      await updateDoc(doc(db, 'users', user.uid), { waterAmount: amount });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const reset = () => {
    setNutritionData(null);
    setError(null);
  };

  const handleCompleteOnboarding = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), { hasCompletedOnboarding: true });
    } catch (err) {
      console.error('Error completing onboarding:', err);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const hasNativeBottomAd = Capacitor.isNativePlatform() && !userProfile?.isPremium;

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col max-w-md mx-auto relative overflow-hidden font-sans">
      {!userProfile?.hasCompletedOnboarding && <Onboarding onComplete={handleCompleteOnboarding} />}
      
      <ErrorModal 
        isOpen={showErrorModal} 
        onClose={() => setShowErrorModal(false)} 
        message={errorModalMessage} 
      />
      
      {/* Header */}
      <header className="p-6 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-500 p-2 rounded-xl">
            <Apple className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">NutriSnap</h1>
          {(userProfile?.currentStreak || 0) > 0 && (
            <div className="ml-2 flex items-center gap-1 bg-orange-100 px-2 py-1 rounded-full">
              <span className="text-orange-500 text-xs font-bold">🔥 {userProfile?.currentStreak}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 text-zinc-400 hover:text-emerald-500 transition-colors"
          >
            {isDarkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
          </button>
          <button 
            onClick={() => setShowFavorites(true)}
            className="p-2 text-zinc-400 hover:text-pink-500 transition-colors"
          >
            <Heart className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setShowVoiceCommand(true)}
            className="p-2 text-zinc-400 hover:text-emerald-500 transition-colors"
          >
            <Mic className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setShowManualEntry(true)}
            className="p-2 text-zinc-400 hover:text-emerald-500 transition-colors"
          >
            <Plus className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setActiveView('profile')}
            className={`p-2 transition-colors ${activeView === 'profile' ? 'text-emerald-500' : 'text-zinc-400'}`}
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </header>

      <main className={`flex-1 p-6 ${hasNativeBottomAd ? 'pb-48' : 'pb-24'}`}>
        <AnimatePresence mode="wait">
          {activeView === 'scan' && (
            <motion.div
              key="scan-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {!nutritionData ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-3xl font-bold text-zinc-900 leading-tight">
                      What are you eating <br />
                      <span className="text-emerald-500">today?</span>
                    </h2>
                    <p className="text-zinc-500 font-medium">Take a photo to see the nutritional values.</p>
                  </div>

                  {!userProfile?.isPremium && (
                    <div className="mb-4">
                      <AdBanner type="banner" />
                    </div>
                  )}

                  <CameraView 
                    onCapture={handleCapture} 
                    onBarcodeScan={handleBarcodeScan}
                    isProcessing={isProcessing} 
                    scansToday={userProfile?.scansToday || 0}
                    scanLimit={userProfile?.isPremium ? PREMIUM_SCAN_LIMIT : SCAN_LIMIT}
                    isPremium={userProfile?.isPremium || false}
                  />

                  {successMessage && (
                    <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl text-sm font-medium flex items-center gap-2 border border-emerald-100">
                      <Info className="w-4 h-4" />
                      {successMessage}
                    </div>
                  )}

                  {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-medium flex items-center gap-2 border border-red-100">
                      <Info className="w-4 h-4" />
                      {error}
                    </div>
                  )}
                </div>
              ) : isProcessing ? (
                <SkeletonLoader />
              ) : (
                <NutritionDisplay 
                  data={nutritionData} 
                  onReset={reset} 
                  onSave={handleSaveToLog}
                  onSaveFavorite={handleSaveFavorite}
                />
              )}
            </motion.div>
          )}

          {activeView === 'log' && (
            <motion.div
              key="log-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <LogView 
                entries={logs} 
                scans={scans}
                onDelete={handleDeleteLog} 
                onDeleteScan={async (id) => {
                  if (!user) return;
                  try {
                    await deleteDoc(doc(db, 'users', user.uid, 'scans', id));
                  } catch (err) {
                    handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/scans/${id}`);
                  }
                }}
                onItemClick={(item) => {
                  setNutritionData(item);
                  setActiveView('scan');
                }}
                dailyGoal={userProfile?.dailyCalorieGoal || 2000}
                proteinGoal={userProfile?.dailyProteinGoal || 150}
                carbsGoal={userProfile?.dailyCarbsGoal || 200}
                fatGoal={userProfile?.dailyFatGoal || 70}
                waterAmount={waterAmount}
                onUpdateWater={handleUpdateWater}
                isPremium={userProfile?.isPremium || false}
                onUpgradeClick={() => setActiveView('profile')}
              />
            </motion.div>
          )}

          {activeView === 'profile' && (
            <motion.div
              key="profile-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Profile />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {showManualEntry && (
          <ManualEntry 
            onSave={handleSaveToLog} 
            onClose={() => setShowManualEntry(false)} 
          />
        )}
        {showVoiceCommand && (
          <VoiceCommand 
            onResult={handleVoiceResult}
            onClose={() => setShowVoiceCommand(false)}
            isLimitReached={!userProfile?.isPremium && (userProfile?.scansToday || 0) >= SCAN_LIMIT}
          />
        )}
        <FavoritesModal
          isOpen={showFavorites}
          onClose={() => setShowFavorites(false)}
          userId={user.uid}
          onLogMeal={handleSaveToLog}
        />
      </AnimatePresence>

      {/* Bottom Nav */}
      <nav className={`fixed left-0 right-0 max-w-md mx-auto px-4 pt-3 pb-4 flex justify-around items-center z-10 border border-zinc-200/70 bg-white/95 backdrop-blur-xl shadow-[0_-10px_30px_rgba(0,0,0,0.08)] ${hasNativeBottomAd ? 'bottom-[88px] rounded-2xl mx-3' : 'bottom-0 border-t border-x-0 rounded-none'}`}>
        <button 
          onClick={() => { setActiveView('scan'); reset(); }}
          className={`min-w-[92px] py-1 flex flex-col items-center gap-1 transition-colors ${activeView === 'scan' ? 'text-emerald-500' : 'text-zinc-300'}`}
        >
          <Camera className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Scan</span>
        </button>
        <button 
          onClick={() => setActiveView('log')}
          className={`min-w-[92px] py-1 flex flex-col items-center gap-1 transition-colors ${activeView === 'log' ? 'text-emerald-500' : 'text-zinc-300'}`}
        >
          <History className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Logbook</span>
        </button>
      </nav>
    </div>
  );
}
