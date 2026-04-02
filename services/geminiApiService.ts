// Secure API service that calls our server-side endpoint

export const generateWidgetCode = async (prompt: string): Promise<string> => {
  try {
    const response = await fetch('/api/generate-widget', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate widget');
    }

    const data = await response.json();
    return data.code;
  } catch (error) {
    console.error('Error calling widget generation API:', error);
    throw error;
  }
};

export const updateWidgetCode = async (prompt: string, existingCode: string): Promise<string> => {
  try {
    const response = await fetch('/api/generate-widget', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        existingCode
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update widget');
    }

    const data = await response.json();
    return data.code;
  } catch (error) {
    console.error('Error calling widget update API:', error);
    throw error;
  }
};