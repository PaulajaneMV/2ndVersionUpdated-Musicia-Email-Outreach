// spintax.js
// Common phrases that will be converted to spintax
const spintaxPhrases = {
  "essentially": "{Essentially|Basically|Primarily}",
  "handle": "{handle|manage|book}",
  "of course": "{of course|naturally}",
  "personally": "{personally|directly}",
  "make": "{make|do|secure}",
  "unrelated": "{unrelated|nothing}",
  "shows": "{shows|gigs|performances}",
  "musician": "{musician|artist|performer}",
  "booking": "{booking|scheduling|arranging}",
  "great": "{great|excellent|fantastic}",
  "contact": "{contact|reach out to|get in touch with}",
  "looking forward": "{looking forward|excited|thrilled}",
  "opportunity": "{opportunity|chance|possibility}",
  "work together": "{work together|collaborate|partner}",
  "best regards": "{Best regards|Kind regards|Best wishes|Warm regards}"
};

// Convert normal text to spintax format
export const convertToSpintax = (text) => {
  if (!text) return text;
  
  let spintaxText = text;
  Object.entries(spintaxPhrases).forEach(([phrase, replacement]) => {
    const regex = new RegExp(`\\b${phrase}\\b`, 'gi');
    spintaxText = spintaxText.replace(regex, replacement);
  });
  
  return spintaxText;
};

// Process spintax to get a random variation
export const processSpintax = (text) => {
  if (!text) return text;
  return text.replace(/\{([^{}]*)\}/g, (match, choices) => {
    const options = choices.split('|');
    return options[Math.floor(Math.random() * options.length)];
  });
};

// Generate multiple variations from spintax text
export const generateSpintaxVariations = (text, limit = 3) => {
  if (!text) return [];
  
  const variations = new Set();
  for (let i = 0; i < limit * 2 && variations.size < limit; i++) {
    variations.add(processSpintax(text));
  }
  return Array.from(variations);
};

// Preview spintax variations
export const previewSpintaxVariations = async (content, count = 3) => {
  try {
    const response = await fetch('/api/email-campaigns/preview-spintax', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ content, count })
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate preview');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error previewing spintax:', error);
    throw error;
  }
};