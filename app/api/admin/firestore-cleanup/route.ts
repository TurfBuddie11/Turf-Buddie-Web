import { NextRequest, NextResponse } from "next/server";
import { 
  cleanupFirestoreData, 
  validateFirestoreData,
  standardizeTimeSlotFormats,
  addMissingCommissionData 
} from "@/lib/utils/firestore-cleanup";

export async function POST(request: NextRequest) {
  try {
    // Basic auth check - in production you'd want proper admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_SECRET_KEY}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { action } = await request.json();

    switch (action) {
      case 'validate':
        const validationResults = await validateFirestoreData();
        return NextResponse.json({ 
          success: true, 
          action: 'validate',
          results: validationResults 
        });

      case 'standardize-time-formats':
        const standardizeCount = await standardizeTimeSlotFormats();
        return NextResponse.json({ 
          success: true, 
          action: 'standardize-time-formats',
          updatedDocuments: standardizeCount 
        });

      case 'add-commission-data':
        const commissionCount = await addMissingCommissionData();
        return NextResponse.json({ 
          success: true, 
          action: 'add-commission-data',
          updatedDocuments: commissionCount 
        });

      case 'full-cleanup':
        await cleanupFirestoreData();
        return NextResponse.json({ 
          success: true, 
          action: 'full-cleanup',
          message: 'Complete cleanup executed successfully' 
        });

      default:
        return NextResponse.json(
          { error: "Invalid action. Use: validate, standardize-time-formats, add-commission-data, or full-cleanup" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Firestore cleanup API error:', error);
    return NextResponse.json(
      { 
        error: "Cleanup operation failed", 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Firestore Cleanup API",
    availableActions: [
      "validate - Check current data state",
      "standardize-time-formats - Fix time slot formatting",
      "add-commission-data - Add missing commission calculations",
      "full-cleanup - Run complete cleanup process"
    ],
    usage: "POST with { action: 'action-name' } and Authorization header"
  });
}
