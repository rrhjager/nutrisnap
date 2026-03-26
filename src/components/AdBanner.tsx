import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { AdMob, BannerAdOptions, BannerAdSize, BannerAdPosition } from '@capacitor-community/admob';

interface AdBannerProps {
  type?: 'banner' | 'card';
}

export const AdBanner: React.FC<AdBannerProps> = ({ type = 'banner' }) => {
  const isNative = Capacitor.isNativePlatform();
  const [isAdLoaded, setIsAdLoaded] = useState(false);

  useEffect(() => {
    // Only initialize native AdMob if running as an Android/iOS app via Capacitor
    if (!isNative) return;

    // Native AdMob banners float over the screen. We only trigger it for the 'banner' type.
    if (type === 'banner') {
      const showNativeBanner = async () => {
        try {
          const options: BannerAdOptions = {
            adId: 'ca-app-pub-3940256099942544/6300978111', // Standard Google Test Ad ID for Android Banners
            adSize: BannerAdSize.BANNER,
            position: BannerAdPosition.BOTTOM_CENTER,
            margin: 0,
            isTesting: true
          };
          await AdMob.showBanner(options);
          setIsAdLoaded(true);
        } catch (err) {
          console.error("AdMob Banner Error", err);
        }
      };
      
      showNativeBanner();

      return () => {
        AdMob.hideBanner().catch(console.error);
        AdMob.removeBanner().catch(console.error);
      };
    }
  }, [isNative, type]);

  // If running as a native app, the AdMob banner floats over the UI.
  // We just return empty space to prevent content from hiding behind the floating banner.
  if (isNative && type === 'banner' && isAdLoaded) {
    return <div className="w-full h-[60px]" />;
  }

  // No web fallback banners anymore since the app is native-only
  return null;
};
