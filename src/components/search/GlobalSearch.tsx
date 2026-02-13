import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { MessageCircle, User, Phone, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatPhoneNumber } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SearchResult {
  id: string;
  type: 'contact' | 'conversation';
  name: string;
  phone: string;
  subtitle?: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Listen for Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Search debounced
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const searchTerm = `%${query}%`;

        const { data: contacts } = await supabase
          .from('contacts')
          .select('id, name, phone')
          .or(`name.ilike.${searchTerm},phone.ilike.${searchTerm}`)
          .limit(8);

        const mapped: SearchResult[] = (contacts || []).map(c => ({
          id: c.id,
          type: 'contact',
          name: c.name || formatPhoneNumber(c.phone),
          phone: c.phone,
          subtitle: c.name ? formatPhoneNumber(c.phone) : undefined,
        }));

        setResults(mapped);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  const handleSelect = useCallback((result: SearchResult) => {
    setOpen(false);
    setQuery('');
    navigate(`/chat/${result.phone}`);
  }, [navigate]);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
        <span className="hidden md:inline text-xs">Buscar...</span>
        <kbd className="pointer-events-none hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Buscar contato por nome ou telefone..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {loading ? 'Buscando...' : 'Nenhum resultado encontrado.'}
          </CommandEmpty>
          {results.length > 0 && (
            <CommandGroup heading="Contatos">
              {results.map((result) => (
                <CommandItem
                  key={result.id}
                  value={`${result.name} ${result.phone}`}
                  onSelect={() => handleSelect(result)}
                  className="cursor-pointer"
                >
                  <User className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{result.name}</span>
                    {result.subtitle && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {result.subtitle}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
