// lib/utils/firestore-cleanup.ts
import { adminDb } from '@/lib/firebase/admin';

interface TimeSlotData {
  timeSlot: string;
  daySlot: string;
  monthSlot: string;
  userUid: string;
  transactionId: string;
  status: string;
  bookingDate: Date | string | number; // More specific type for bookingDate
  price: number;
  commission?: number;
  commision?: number; // Typo in existing data
  payout?: number;
  paid?: string;
}

/**
 * Standardizes time slot formatting across all turf documents
 * Converts formats like "3:00 PM - 4:00 PM" to "3 PM - 4 PM"
 */
export async function standardizeTimeSlotFormats() {
  try {
    const turfsRef = adminDb.collection('Turfs');
    const snapshot = await turfsRef.get();
    
    let updateCount = 0;
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const timeSlots = data.timeSlots as TimeSlotData[];
      
      if (!timeSlots || !Array.isArray(timeSlots)) continue;
      
      let needsUpdate = false;
      const updatedTimeSlots = timeSlots.map(slot => {
        // Standardize time format: "3:00 PM - 4:00 PM" -> "3 PM - 4 PM"
        const standardizedTimeSlot = slot.timeSlot
          .replace(/(\d+):00\s*(AM|PM)/g, '$1 $2')
          .replace(/\s*-\s*/g, ' - ');
        
        if (standardizedTimeSlot !== slot.timeSlot) {
          needsUpdate = true;
        }
        
        return {
          ...slot,
          timeSlot: standardizedTimeSlot
        };
      });
      
      if (needsUpdate) {
        await doc.ref.update({ timeSlots: updatedTimeSlots });
        updateCount++;
        console.log(`Updated time slots for turf: ${doc.id}`);
      }
    }
    
    console.log(`Standardized time slots in ${updateCount} turf documents`);
    return updateCount;
  } catch (error) {
    console.error('Error standardizing time slot formats:', error);
    throw error;
  }
}

/**
 * Adds missing commission and payout calculations to existing bookings
 */
export async function addMissingCommissionData() {
  try {
    const turfsRef = adminDb.collection('Turfs');
    const snapshot = await turfsRef.get();
    
    let updateCount = 0;
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const timeSlots = data.timeSlots as TimeSlotData[];
      
      if (!timeSlots || !Array.isArray(timeSlots)) continue;
      
      let needsUpdate = false;
      const updatedTimeSlots = timeSlots.map(slot => {
        // Only update slots that are confirmed online payments but missing commission data
        if (slot.status === 'confirmed' && slot.transactionId?.startsWith('pay_') && !slot.commission && !slot.commision) {
          const commission = slot.price * 0.094;
          const payout = slot.price - commission;
          
          needsUpdate = true;
          
          return {
            ...slot,
            commission: Math.round(commission * 1000) / 1000,
            commision: Math.round(commission * 1000) / 1000, // Keep typo for consistency
            payout: Math.round(payout * 1000) / 1000,
            paid: slot.paid || "Not Paid to Owner"
          };
        }
        
        return slot;
      });
      
      if (needsUpdate) {
        await doc.ref.update({ timeSlots: updatedTimeSlots });
        updateCount++;
        console.log(`Added missing commission data for turf: ${doc.id}`);
      }
    }
    
    console.log(`Added commission data to ${updateCount} turf documents`);
    return updateCount;
  } catch (error) {
    console.error('Error adding missing commission data:', error);
    throw error;
  }
}

/**
 * Validates and reports inconsistencies in the Firestore data structure
 */
export async function validateFirestoreData() {
  try {
    const turfsRef = adminDb.collection('Turfs');
    const snapshot = await turfsRef.get();
    
    const validationResults = {
      totalTurfs: snapshot.size,
      totalBookings: 0,
      onlineBookings: 0,
      offlineBookings: 0,
      bookingsWithCommission: 0,
      bookingsWithoutCommission: 0,
      inconsistentTimeFormats: 0,
      missingRequiredFields: [] as string[]
    };
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const timeSlots = data.timeSlots as TimeSlotData[];
      
      // Check for required turf fields
      const requiredFields = ['name', 'address', 'price', 'rating'];
      for (const field of requiredFields) {
        if (!data[field]) {
          validationResults.missingRequiredFields.push(`${doc.id}: missing ${field}`);
        }
      }
      
      if (!timeSlots || !Array.isArray(timeSlots)) continue;
      
      validationResults.totalBookings += timeSlots.length;
      
      for (const slot of timeSlots) {
        // Count booking types
        if (slot.transactionId === 'booked_offline' || slot.status === 'booked_offline') {
          validationResults.offlineBookings++;
        } else if (slot.transactionId?.startsWith('pay_')) {
          validationResults.onlineBookings++;
        }
        
        // Check for commission data
        if (slot.commission || slot.commision) {
          validationResults.bookingsWithCommission++;
        } else {
          validationResults.bookingsWithoutCommission++;
        }
        
        // Check time format consistency
        if (slot.timeSlot?.includes(':00')) {
          validationResults.inconsistentTimeFormats++;
        }
      }
    }
    
    console.log('Firestore Data Validation Results:', validationResults);
    return validationResults;
  } catch (error) {
    console.error('Error validating Firestore data:', error);
    throw error;
  }
}

/**
 * Complete cleanup function that runs all standardization tasks
 */
export async function cleanupFirestoreData() {
  console.log('Starting Firestore data cleanup...');
  
  try {
    // First, validate current state
    console.log('\n=== Current Data State ===');
    await validateFirestoreData();
    
    // Standardize time slot formats
    console.log('\n=== Standardizing Time Slot Formats ===');
    await standardizeTimeSlotFormats();
    
    // Add missing commission data
    console.log('\n=== Adding Missing Commission Data ===');
    await addMissingCommissionData();
    
    // Validate final state
    console.log('\n=== Final Data State ===');
    await validateFirestoreData();
    
    console.log('\n✅ Firestore cleanup completed successfully!');
  } catch (error) {
    console.error('❌ Firestore cleanup failed:', error);
    throw error;
  }
}
