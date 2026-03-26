import Constants from 'expo-constants';

export const gradeCard = async (front, back) => {
    try {
        const extra = Constants.expoConfig?.extra || {};
        const GradeApiKey = extra.ximilarApiKey;
        
        if (!GradeApiKey) {
            throw new Error('Ximilar API key not found in app config');
        }
        
        const url = "https://api.ximilar.com/card-grader/v2/grade";
        
        // The API expects _url fields, not front/back directly
        const requestBody = {
            "records": [
                {
                    "_url": front,  // Use _url for the front image
                    "back": {
                        "_url": back  // Back image needs to be nested with _url
                    }
                }
            ]
        };
        
        console.log('Sending to Ximilar:', JSON.stringify(requestBody, null, 2));
        
        const requestOptions = {
            method: 'POST',
            headers: {
                'Authorization': `Token ${GradeApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        };
        
        const response = await fetch(url, requestOptions);
        const data = await response.json();
        
        console.log('Ximilar raw response:', JSON.stringify(data, null, 2));
        
        // Check if we have records with status
        if (data.records && data.records.length > 0) {
            const record = data.records[0];
            
            // Check if there's an error in the record status
            if (record._status) {
                // Handle both array and object formats
                const status = Array.isArray(record._status) ? record._status[0] : record._status;
                if (status.code && status.code !== 200) {
                    console.error('Record status error:', status);
                    throw new Error(status.text || status.message || 'Error processing image');
                }
            }
            
            // Extract grade information from the nested structure
            const gradeInfo = {
                // The final grade is in record.grades.final
                grade: record.grades?.final || record.overall_grade || record.grade || null,
                // Individual subgrades
                subgrades: {
                    centering: record.grades?.centering || record.centering,
                    corners: record.grades?.corners || record.corners,
                    edges: record.grades?.edges || record.edges,
                    surface: record.grades?.surface || record.surface
                },
                // Condition text
                condition: record.grades?.condition,
                // Keep the raw data for debugging
                raw: record
            };
            
            console.log('Extracted grade info:', gradeInfo);
            return gradeInfo;
        }
        
        throw new Error(data.status?.text || 'Unknown error from API');
        
    } catch (error) {
        console.error('Error in gradeCard:', error);
        throw error;
    }
};