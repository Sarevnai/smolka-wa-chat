import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ContactData {
  name: string;
  phone: string;
  email?: string;
  contact_type: 'proprietario' | 'inquilino';
  notes?: string;
  contracts: Array<{
    contract_number: string;
    contract_type?: string;
    status: 'ativo' | 'encerrado' | 'suspenso';
  }>;
}

function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-numeric characters
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Check if it's a Brazilian number with country code (starts with 55 and has 13 digits total)
  if (cleanPhone.startsWith('55') && cleanPhone.length === 13) {
    // Format: +55 (XX) 9 XXXX-XXXX
    const countryCode = cleanPhone.slice(0, 2);
    const areaCode = cleanPhone.slice(2, 4);
    const ninthDigit = cleanPhone.slice(4, 5);
    const firstPart = cleanPhone.slice(5, 9);
    const secondPart = cleanPhone.slice(9, 13);
    
    return `+${countryCode} (${areaCode}) ${ninthDigit} ${firstPart}-${secondPart}`;
  }
  
  // Check if it's a Brazilian mobile number without country code (11 digits)
  if (cleanPhone.length === 11) {
    // Add country code and format: +55 (XX) 9 XXXX-XXXX
    const areaCode = cleanPhone.slice(0, 2);
    const ninthDigit = cleanPhone.slice(2, 3);
    const firstPart = cleanPhone.slice(3, 7);
    const secondPart = cleanPhone.slice(7, 11);
    
    return `+55 (${areaCode}) ${ninthDigit} ${firstPart}-${secondPart}`;
  }
  
  // Check if it's a Brazilian number without the 9 digit (10 digits)
  if (cleanPhone.length === 10) {
    // Add country code and 9 digit, then format: +55 (XX) 9 XXXX-XXXX
    const areaCode = cleanPhone.slice(0, 2);
    const firstPart = cleanPhone.slice(2, 6);
    const secondPart = cleanPhone.slice(6, 10);
    
    return `+55 (${areaCode}) 9 ${firstPart}-${secondPart}`;
  }
  
  // Return original if doesn't match Brazilian format
  return phone;
}

function parseCSVLine(line: string): string[] {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

function parseContactData(csvLine: string[]): ContactData | null {
  const [firstName, lastName, displayName, , email, , , homePhone, businessPhone, , , , mobilePhone, , , , , , , , , , , , , , , notes] = csvLine;
  
  // Get the best name available
  let name = displayName || `${firstName || ''} ${lastName || ''}`.trim();
  if (!name) return null;
  
  // Get the best phone available
  let phone = mobilePhone || businessPhone || homePhone;
  if (!phone) return null;
  
  // Format phone number
  phone = formatPhoneNumber(phone);
  if (!phone) return null;
  
  // Extract contract information from name
  const contractMatches = name.match(/(inq|pp|ct|cont)\s*(\d+)/gi) || [];
  const contracts: Array<{ contract_number: string; contract_type?: string; status: 'ativo' | 'encerrado' | 'suspenso' }> = [];
  
  // Determine contact type based on name patterns
  let contact_type: 'proprietario' | 'inquilino' = 'proprietario'; // default
  
  if (name.toLowerCase().includes('inq') || name.toLowerCase().includes('inquilino')) {
    contact_type = 'inquilino';
  } else if (name.toLowerCase().includes('pp') || name.toLowerCase().includes('proprietario')) {
    contact_type = 'proprietario';
  }
  
  // Extract contract numbers
  contractMatches.forEach(match => {
    const [, type, number] = match.match(/(inq|pp|ct|cont)\s*(\d+)/i) || [];
    if (number) {
      contracts.push({
        contract_number: number,
        contract_type: type.toLowerCase() === 'inq' ? 'locacao' : 
                      type.toLowerCase() === 'pp' ? 'propriedade' : 'contrato',
        status: 'ativo'
      });
    }
  });
  
  // Clean up name by removing contract references and extra characters
  const cleanName = name
    .replace(/(inq|pp|ct|cont)\s*\d+/gi, '')
    .replace(/[😁🦷🍀]/g, '') // Remove emojis
    .replace(/\s+/g, ' ')
    .trim();
  
  return {
    name: cleanName,
    phone,
    email: email || undefined,
    contact_type,
    notes: notes || undefined,
    contracts
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting contact import process...');

    // Read CSV from request body - NO FALLBACK to embedded data
    let csvText = '';
    try {
      const contentType = req.headers.get('content-type') || '';
      if (req.method === 'POST') {
        if (contentType.includes('application/json')) {
          const body = await req.json().catch(() => null);
          if (body?.csv && typeof body.csv === 'string' && body.csv.trim().length > 0) {
            csvText = body.csv;
            console.log('Using uploaded CSV from JSON body');
          }
        } else {
          const textBody = await req.text();
          if (textBody && textBody.trim().length > 0) {
            csvText = textBody;
            console.log('Using uploaded CSV from text body');
          }
        }
      }
    } catch (e) {
      console.error('Failed to parse request body:', e?.message);
    }

    // Return error if no CSV provided
    if (!csvText || csvText.trim().length === 0) {
      console.error('No CSV data provided in request');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Nenhum CSV fornecido. Faça upload de um arquivo CSV válido.' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const lines = csvText.split(/\r?\n/);
    console.log(`Found ${lines.length - 1} contacts to process`);

    const contacts: ContactData[] = [];
    const errors: string[] = [];

    // Process each line (skip header)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      try {
        const csvLine = parseCSVLine(line);
        const contactData = parseContactData(csvLine);
        
        if (contactData) {
          contacts.push(contactData);
        }
      } catch (error) {
        console.error(`Error parsing line ${i + 1}:`, error);
        errors.push(`Line ${i + 1}: ${error.message}`);
      }
    }

    console.log(`Parsed ${contacts.length} valid contacts`);

    // Insert contacts in batches
    let inserted = 0;
    let updated = 0;
    const insertErrors: string[] = [];

    for (const contact of contacts) {
      try {
        // Check if contact already exists by phone
        const { data: existingContact } = await supabase
          .from('contacts')
          .select('id')
          .eq('phone', contact.phone)
          .maybeSingle();

        if (existingContact) {
          // Update existing contact
          const { error: updateError } = await supabase
            .from('contacts')
            .update({
              name: contact.name,
              email: contact.email,
              contact_type: contact.contact_type,
              notes: contact.notes,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingContact.id);

          if (updateError) {
            throw updateError;
          }

          // Handle contracts for existing contact
          for (const contract of contact.contracts) {
            const { error: contractError } = await supabase
              .from('contact_contracts')
              .upsert({
                contact_id: existingContact.id,
                contract_number: contract.contract_number,
                contract_type: contract.contract_type,
                status: contract.status
              });

            if (contractError) {
              console.error('Contract insert error:', contractError);
            }
          }

          updated++;
        } else {
          // Insert new contact
          const { data: newContact, error: insertError } = await supabase
            .from('contacts')
            .insert({
              name: contact.name,
              phone: contact.phone,
              email: contact.email,
              contact_type: contact.contact_type,
              notes: contact.notes,
              status: 'ativo'
            })
            .select('id')
            .single();

          if (insertError) {
            throw insertError;
          }

          // Insert contracts for new contact
          for (const contract of contact.contracts) {
            const { error: contractError } = await supabase
              .from('contact_contracts')
              .insert({
                contact_id: newContact.id,
                contract_number: contract.contract_number,
                contract_type: contract.contract_type,
                status: contract.status
              });

            if (contractError) {
              console.error('Contract insert error:', contractError);
            }
          }

          inserted++;
        }
      } catch (error) {
        console.error(`Error processing contact ${contact.name}:`, error);
        insertErrors.push(`${contact.name} (${contact.phone}): ${error.message}`);
      }
    }

    const result = {
      success: true,
      totalProcessed: contacts.length,
      inserted,
      updated,
      parseErrors: errors,
      insertErrors,
      summary: `Imported ${inserted} new contacts and updated ${updated} existing contacts.`
    };

    console.log('Import completed:', result);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Import function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});