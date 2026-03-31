// ============================================
// MediSense AI — Health Twin Service
// ============================================

import { getAuthenticatedClient } from '../config/supabase.js';

export const healthTwinService = {
    /**
     * Inserts a health event into the database for the authenticated user
     * @param {Object} req - The Express request object containing req.user and req.token
     * @param {string} type - 'symptom', 'report', 'drug', 'skin', or 'emergency'
     * @param {Object} inputData - The user's input payload
     * @param {Object} aiResponse - The AI's parsed JSON response
     */
    async insertEvent(req, type, inputData, aiResponse) {
        if (!req.user || !req.token) return; // User not logged in, skip silently

        const supabaseAuth = getAuthenticatedClient(req.token);
        if (!supabaseAuth) return;

        try {
            // First get the user's primary profile (Self)
            const { data: profile, error: profileError } = await supabaseAuth
                .from('profiles')
                .select('id')
                .eq('user_id', req.user.id)
                .eq('relation', 'Self')
                .single();

            if (profileError || !profile) {
                console.error(`[HealthTwin] Profile not found for user ${req.user.id}`);
                return;
            }

            // Insert health event
            const { error: insertError } = await supabaseAuth
                .from('health_events')
                .insert([{
                    profile_id: profile.id,
                    type: type,
                    input_data: inputData,
                    ai_response: aiResponse
                }]);

            if (insertError) {
                console.error(`[HealthTwin] Error inserting ${type} event:`, insertError);
            } else {
                console.log(`[HealthTwin] Successfully saved ${type} event for user ${req.user.id}`);
            }
        } catch (error) {
            console.error(`[HealthTwin] Unexpected error inserting ${type} event:`, error);
        }
    }
};
