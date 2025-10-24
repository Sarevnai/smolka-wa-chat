import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Camera, User, Mail, Save, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import Layout from '@/components/Layout';
import { validateUsername, sanitizeUsername } from '@/lib/username-validation';

export default function Profile() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [usernameValidation, setUsernameValidation] = useState<{ isValid: boolean; error?: string }>({ isValid: true });
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    username: profile?.username || '',
    email: user?.email || ''
  });

  const handleUsernameChange = (value: string) => {
    const sanitized = sanitizeUsername(value);
    const validation = validateUsername(sanitized);
    
    setUsernameValidation(validation);
    setFormData({ ...formData, username: sanitized });
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validar username antes de enviar
    const validation = validateUsername(formData.username);
    if (!validation.isValid) {
      toast({
        title: 'Username inválido',
        description: validation.error,
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          full_name: formData.full_name,
          username: formData.username,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Update email if it changed
      if (formData.email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: formData.email
        });
        
        if (emailError) throw emailError;
        
        toast({
          title: 'Perfil atualizado!',
          description: 'Verifique seu email para confirmar a alteração do endereço.'
        });
      } else {
        toast({
          title: 'Perfil atualizado!',
          description: 'Suas informações foram salvas com sucesso.'
        });
      }
      
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar perfil',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setAvatarUploading(true);

    try {
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: publicData.publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast({
        title: 'Avatar atualizado!',
        description: 'Sua foto de perfil foi alterada com sucesso.'
      });

      // Refresh the page to show new avatar
      window.location.reload();
      
    } catch (error: any) {
      toast({
        title: 'Erro ao fazer upload da imagem',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setAvatarUploading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Meu Perfil</h1>
          <p className="text-muted-foreground">
            Gerencie suas informações pessoais e preferências
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="text-lg">
                    {profile?.full_name ? getInitials(profile.full_name) : 'U'}
                  </AvatarFallback>
                </Avatar>
                
                <label className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer hover:bg-primary/90 transition-colors">
                  <Camera className="h-4 w-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    disabled={avatarUploading}
                  />
                </label>
                
                {avatarUploading && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  </div>
                )}
              </div>
              
              <p className="text-sm text-muted-foreground text-center">
                Clique na câmera para alterar sua foto de perfil
              </p>
            </div>

            {/* Profile Form */}
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nome Completo</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Digite seu nome completo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username (identificador único)</Label>
                <div className="relative">
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder="seu_username"
                    maxLength={30}
                    className={!usernameValidation.isValid ? 'border-destructive' : ''}
                  />
                  {usernameValidation.isValid && formData.username && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                  )}
                  {!usernameValidation.isValid && formData.username && (
                    <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
                  )}
                </div>
                {!usernameValidation.isValid && formData.username && (
                  <p className="text-xs text-destructive">{usernameValidation.error}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  @{formData.username || 'seu_username'} • Código #{profile?.user_code || '0000'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="seu@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label>Papel no Sistema</Label>
                <div className="p-3 bg-muted rounded-md">
                  <span className="capitalize font-medium">
                    {profile?.roles?.includes('admin') ? 'Administrador' : profile?.roles?.[0] || 'Atendente'}
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
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
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}