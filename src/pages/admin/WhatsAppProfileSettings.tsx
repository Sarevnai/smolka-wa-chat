import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { WhatsAppProfilePhotoUpload } from '@/components/admin/WhatsAppProfilePhotoUpload';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Save, 
  Loader2, 
  RefreshCw, 
  MessageCircle, 
  Globe, 
  Mail, 
  MapPin,
  Info,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface WhatsAppProfile {
  about?: string;
  description?: string;
  email?: string;
  websites?: string[];
  address?: string;
  profile_picture_url?: string;
}

export default function WhatsAppProfileSettings() {
  const [profile, setProfile] = useState<WhatsAppProfile>({
    about: '',
    description: '',
    email: '',
    websites: ['', ''],
    address: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalProfile, setOriginalProfile] = useState<WhatsAppProfile | null>(null);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        'https://wpjxsgxxhogzkkuznyke.supabase.co/functions/v1/update-whatsapp-profile',
        { 
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session?.access_token || ''}`,
          }
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Falha ao carregar perfil');
      }
      
      const profileData = data.profile || {};
      const loadedProfile = {
        about: profileData.about || '',
        description: profileData.description || '',
        email: profileData.email || '',
        websites: profileData.websites || ['', ''],
        address: profileData.address || '',
        profile_picture_url: profileData.profile_picture_url,
      };
      
      // Ensure websites array has 2 slots
      while (loadedProfile.websites.length < 2) {
        loadedProfile.websites.push('');
      }
      
      setProfile(loadedProfile);
      setOriginalProfile(loadedProfile);
      setLastSynced(new Date());
      setHasChanges(false);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao carregar perfil');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleChange = (field: keyof WhatsAppProfile, value: string | string[]) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleWebsiteChange = (index: number, value: string) => {
    const newWebsites = [...(profile.websites || ['', ''])];
    newWebsites[index] = value;
    handleChange('websites', newWebsites);
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      // Validate
      if (profile.about && profile.about.length > 139) {
        throw new Error('O texto "Sobre" deve ter no máximo 139 caracteres');
      }
      if (profile.description && profile.description.length > 512) {
        throw new Error('A descrição deve ter no máximo 512 caracteres');
      }
      
      const payload: Partial<WhatsAppProfile> = {};
      
      // Only send changed fields
      if (profile.about !== originalProfile?.about) payload.about = profile.about;
      if (profile.description !== originalProfile?.description) payload.description = profile.description;
      if (profile.email !== originalProfile?.email) payload.email = profile.email;
      if (profile.address !== originalProfile?.address) payload.address = profile.address;
      
      const filteredWebsites = profile.websites?.filter(w => w.trim() !== '') || [];
      const originalFilteredWebsites = originalProfile?.websites?.filter(w => w.trim() !== '') || [];
      if (JSON.stringify(filteredWebsites) !== JSON.stringify(originalFilteredWebsites)) {
        payload.websites = filteredWebsites;
      }

      if (Object.keys(payload).length === 0) {
        toast.info('Nenhuma alteração para salvar');
        setIsSaving(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        'https://wpjxsgxxhogzkkuznyke.supabase.co/functions/v1/update-whatsapp-profile',
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`,
          },
          body: JSON.stringify(payload),
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Falha ao salvar perfil');
      }
      
      toast.success('Perfil atualizado com sucesso!');
      setOriginalProfile({ ...profile });
      setHasChanges(false);
      setLastSynced(new Date());
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar perfil');
    } finally {
      setIsSaving(false);
    }
  };

  const aboutLength = profile.about?.length || 0;
  const descriptionLength = profile.description?.length || 0;

  return (
    <Layout>
      <div className="container max-w-4xl py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-green-500" />
              Perfil WhatsApp da Arya
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure como sua assistente virtual aparece no WhatsApp
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {lastSynced && (
              <Badge variant="outline" className="text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                Sincronizado {lastSynced.toLocaleTimeString('pt-BR')}
              </Badge>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchProfile}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {/* Preview Card */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Preview</CardTitle>
                <CardDescription>
                  Como aparece no WhatsApp
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center text-center">
                  <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border-4 border-green-500/20">
                    {profile.profile_picture_url ? (
                      <img 
                        src={profile.profile_picture_url} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <MessageCircle className="h-10 w-10 text-muted-foreground" />
                    )}
                  </div>
                  <h3 className="font-semibold mt-3">Arya</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {profile.about || 'Sem descrição curta'}
                  </p>
                </div>
                
                <Separator />
                
                <div className="space-y-2 text-sm">
                  {profile.description && (
                    <p className="text-muted-foreground line-clamp-4">
                      {profile.description}
                    </p>
                  )}
                  
                  {profile.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{profile.email}</span>
                    </div>
                  )}
                  
                  {profile.websites?.filter(w => w).length > 0 && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">
                        {profile.websites.filter(w => w)[0]}
                      </span>
                    </div>
                  )}
                  
                  {profile.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{profile.address}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Settings Form */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Configurações do Perfil</CardTitle>
                <CardDescription>
                  Alterações são enviadas diretamente para a Meta
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Photo Upload */}
                <div className="space-y-2">
                  <Label>Foto de Perfil</Label>
                  <WhatsAppProfilePhotoUpload 
                    currentPhotoUrl={profile.profile_picture_url}
                    onUploadComplete={fetchProfile}
                  />
                </div>

                <Separator />

                {/* About */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="about">Sobre (curto)</Label>
                    <span className={`text-xs ${aboutLength > 139 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {aboutLength}/139
                    </span>
                  </div>
                  <Input
                    id="about"
                    placeholder="Ex: Assistente virtual da Smolka Imóveis"
                    value={profile.about || ''}
                    onChange={(e) => handleChange('about', e.target.value)}
                    maxLength={139}
                  />
                  <p className="text-xs text-muted-foreground">
                    Texto curto exibido abaixo do nome no perfil
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="description">Descrição completa</Label>
                    <span className={`text-xs ${descriptionLength > 512 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {descriptionLength}/512
                    </span>
                  </div>
                  <Textarea
                    id="description"
                    placeholder="Descrição detalhada do seu negócio..."
                    value={profile.description || ''}
                    onChange={(e) => handleChange('description', e.target.value)}
                    maxLength={512}
                    rows={4}
                  />
                </div>

                <Separator />

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="contato@empresa.com"
                    value={profile.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                  />
                </div>

                {/* Websites */}
                <div className="space-y-2">
                  <Label>Websites (máximo 2)</Label>
                  <div className="space-y-2">
                    <Input
                      placeholder="https://www.seusite.com.br"
                      value={profile.websites?.[0] || ''}
                      onChange={(e) => handleWebsiteChange(0, e.target.value)}
                    />
                    <Input
                      placeholder="https://www.outrosite.com.br (opcional)"
                      value={profile.websites?.[1] || ''}
                      onChange={(e) => handleWebsiteChange(1, e.target.value)}
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    placeholder="Rua, número, cidade - estado"
                    value={profile.address || ''}
                    onChange={(e) => handleChange('address', e.target.value)}
                  />
                </div>

                <Separator />

                {/* Info box */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 text-sm">
                  <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Importante</p>
                    <p className="text-muted-foreground">
                      As alterações podem levar alguns minutos para refletir no WhatsApp.
                      A foto de perfil deve ser quadrada para melhor visualização.
                    </p>
                  </div>
                </div>

                {/* Save Button */}
                <Button 
                  onClick={handleSave}
                  disabled={isSaving || !hasChanges}
                  className="w-full"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Alterações
                    </>
                  )}
                </Button>

                {hasChanges && (
                  <div className="flex items-center justify-center gap-2 text-sm text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    Você tem alterações não salvas
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
