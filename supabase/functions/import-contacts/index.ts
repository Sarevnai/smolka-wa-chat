import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

// Embedded CSV data - this is the uploaded contacts file
const CSV_DATA = `First Name,Last Name,Display Name,Nickname,E-mail Address,E-mail 2 Address,E-mail 3 Address,Home Phone,Business Phone,Home Fax,Business Fax,Pager,Mobile Phone,Home Street,Home Address 2,Home City,Home State,Home Postal Code,Home Country,Business Address,Business Address 2,Business City,Business State,Business Postal Code,Business Country,Country Code,Related name,Job Title,Department,Organization,Notes,Birthday,Anniversary,Gender,Web Page,Web Page 2,Categories
Administrativo,Mesquita,Administrativo Mesquita,,,,,+55 48 98801-8382,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
Agnes Pp 379,,Agnes Pp 379,,,,,,,,,,+5548998279420,,,,,,,,,,,,,,,,,Agnes Atendimento ao Cliente,,,,,,,
Alberto,Rezende,Alberto Rezende,,,,,+55 31 99137-1310,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
Aldre,,Aldre,,,,,+5548996622696,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
Alex,Malafaia inq 303,Alex Malafaia inq 303,,,,,+5511983541686,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
Alexandre pp 454,,Alexandre pp 454,,,,,+55 11 97369-0693,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
Alexandre Rezende inq 446,,Alexandre Rezende inq 446,,,,,+55 48 99659-6912,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
Alice Mps Fiança / título,,Alice Mps Fiança / título,,,,,+5548988176841,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
Aline esposa Erick inq 379,,Aline esposa Erick inq 379,,,,,+55 48 99904-5697,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
Aline INQ 460,,Aline INQ 460,,,,,+55 48 99803-7398,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
Amazilio inq 461,,Amazilio inq 461,,,,,+55 48 99182-3360,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
amilton pp 474,,amilton pp 474,,,,,+55 48 99984-4988,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
Ana Lucia V,Moretto Cont 422,Ana Lucia V Moretto Cont 422,,,,,,,,,,+5548999602125,,,,,,,,,,,,,,,,,,,,,,,,
Andrea,PP 402,Andrea PP 402,,,,,+5548991226090,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
Andreia,,Andreia,,,,,+55 48 99610-7250,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
Andrey,,Andrey,,,,,+55 48 99963-8913,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
Ani marri,,Ani marri,,,,,+5548996316207,,,,,,,,,,,,,,,,,,,,,,Ani marri,,,,,,,
Ariane inq 379,,Ariane inq 379,,,,,+55 11 99129-4655,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
Arthur,,Arthur,,,,,+55 48 99699-0104,,,,,,,,,,,,,,,,,,,,,,,,,,,,,`;

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

    const lines = CSV_DATA.split('\n');
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