import { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, MessageSquare, Brain, Bot, FileText, Volume2 } from 'lucide-react';
import { OnboardingData } from '../OnboardingWizard';

interface StepCompletionProps {
  data: OnboardingData;
  healthResults: Record<string, boolean>;
}

export function StepCompletion({ data, healthResults }: StepCompletionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Simple confetti effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      size: number;
      rotation: number;
    }> = [];

    const colors = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899'];

    // Create particles
    for (let i = 0; i < 150; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 15,
        vy: (Math.random() - 0.5) * 15 - 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 10 + 5,
        rotation: Math.random() * 360,
      });
    }

    let animationId: number;
    const gravity = 0.3;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, index) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += gravity;
        p.rotation += 5;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size / 2);
        ctx.restore();

        // Remove particles that are off screen
        if (p.y > canvas.height) {
          particles.splice(index, 1);
        }
      });

      if (particles.length > 0) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, []);

  const configuredItems = [
    { 
      icon: <MessageSquare className="h-5 w-5" />, 
      label: 'WhatsApp Business', 
      active: healthResults.whatsapp 
    },
    { 
      icon: <Brain className="h-5 w-5" />, 
      label: data.aiProvider === 'openai' ? 'OpenAI' : 'Lovable AI', 
      active: healthResults.ai 
    },
    { 
      icon: <Volume2 className="h-5 w-5" />, 
      label: 'ElevenLabs', 
      active: healthResults.elevenlabs && !data.skipElevenlabs 
    },
    { 
      icon: <FileText className="h-5 w-5" />, 
      label: `${data.templatesCount} Templates`, 
      active: healthResults.templates 
    },
    { 
      icon: <Bot className="h-5 w-5" />, 
      label: data.agentName || 'Agente IA', 
      active: healthResults.agent 
    },
  ].filter(item => item.active);

  return (
    <div className="space-y-6 relative">
      {/* Confetti Canvas */}
      <canvas 
        ref={canvasRef} 
        className="fixed inset-0 pointer-events-none z-50"
        style={{ width: '100vw', height: '100vh' }}
      />

      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 mb-4 animate-bounce">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <h3 className="text-2xl font-semibold">🎉 Configuração Concluída!</h3>
        <p className="text-muted-foreground mt-2">
          Seu sistema está pronto para uso
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <h4 className="font-medium mb-4 text-center">O que foi configurado:</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {configuredItems.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800"
              >
                <div className="p-1.5 rounded-full bg-green-100 dark:bg-green-900/50 text-green-600">
                  {item.icon}
                </div>
                <span className="text-sm font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-lg p-6 text-center">
        <h4 className="font-semibold text-lg mb-2">Próximos Passos</h4>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li>✅ Envie uma mensagem de teste pelo WhatsApp</li>
          <li>✅ Configure mais opções do agente IA</li>
          <li>✅ Explore o dashboard de leads</li>
        </ul>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Clique em <strong>"Concluir Configuração"</strong> para finalizar
      </p>
    </div>
  );
}
