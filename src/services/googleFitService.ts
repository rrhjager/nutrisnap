import { NutritionInfo } from './nutritionService';

export interface GoogleFitSyncResult {
  success: boolean;
  error?: string;
}

export const syncMealToGoogleFit = async (
  accessToken: string,
  meal: NutritionInfo,
  timestamp: number = Date.now()
): Promise<GoogleFitSyncResult> => {
  try {
    // Google Fit Nutrition Data Point
    const startTimeNanos = timestamp * 1000000;
    const endTimeNanos = startTimeNanos + 1000000; // 1ms duration

    const dataPoint = {
      dataSourceId: "derived:com.google.nutrition:com.google.android.gms:merged",
      minStartTimeNs: startTimeNanos,
      maxEndTimeNs: endTimeNanos,
      point: [
        {
          startTimeNanos: startTimeNanos,
          endTimeNanos: endTimeNanos,
          dataTypeName: "com.google.nutrition",
          value: [
            {
              mapVal: [
                { key: "calories", value: { fpVal: meal.calories } },
                { key: "protein", value: { fpVal: meal.protein } },
                { key: "fat.total", value: { fpVal: meal.fat } },
                { key: "carbs.total", value: { fpVal: meal.carbs } }
              ]
            },
            { intVal: 0 }, // meal type (0 = unknown)
            { strVal: meal.foodName }
          ]
        }
      ]
    };

    // Create a unique dataset ID based on timestamp
    const datasetId = `${startTimeNanos}-${endTimeNanos}`;
    const url = `https://www.googleapis.com/fitness/v1/users/me/dataSources/derived:com.google.nutrition:com.google.android.gms:merged/datasets/${datasetId}`;

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dataPoint)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to sync to Google Fit');
    }

    return { success: true };
  } catch (err: any) {
    console.error('Google Fit Sync Error:', err);
    return { success: false, error: err.message };
  }
};
