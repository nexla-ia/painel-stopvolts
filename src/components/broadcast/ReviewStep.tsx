import { Profile } from '../../lib/supabase';
import { MidiaCampanha, formatBytes, estimatePayloadBytes } from '../../lib/broadcast';
import { contarLinks } from '../../lib/whatsapp';
import { Users, Image as ImageIcon, Link2, AlertTriangle, CheckCircle2, Video } from 'lucide-react';
import MessagePreview from './MessagePreview';

interface ReviewStepProps {
  titulo: string;
  mensagem: string;
  midias: MidiaCampanha[];
  destinatarios: Profile[];
}

function Resumo({
  icon: Icon,
  valor,
  rotulo,
}: {
  icon: typeof Users;
  valor: string | number;
  rotulo: string;
}) {
  return (
    <div className="flex items-center gap-3.5 p-4 rounded-lg border-2 border-edge">
      <Icon className="w-6 h-6 text-muted shrink-0" />
      <div className="min-w-0">
        <p className="text-2xl font-display font-bold text-fg leading-none font-tabular">{valor}</p>
        <p className="text-sm text-muted mt-1">{rotulo}</p>
      </div>
    </div>
  );
}

export default function ReviewStep({ titulo, mensagem, midias, destinatarios }: ReviewStepProps) {
  const fotos = midias.filter(m => m.tipo === 'imagem').length;
  const videos = midias.filter(m => m.tipo === 'video').length;
  const links = contarLinks(mensagem);
  const peso = estimatePayloadBytes(midias, destinatarios.length, mensagem);
  const pesado = peso > 8 * 1024 * 1024;
  const primeiroNome = destinatarios[0]?.full_name?.split(' ')[0];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_24rem] gap-8 items-start">
      <div className="space-y-6">
        <div className="flex items-start gap-3.5 p-5 rounded-lg border-2 border-success/30 bg-success-soft">
          <CheckCircle2 className="w-6 h-6 text-success shrink-0 mt-0.5" />
          <div>
            <p className="text-lg font-semibold text-fg">Está tudo pronto.</p>
            <p className="text-base text-muted mt-1">
              Confira o resumo abaixo. Depois de enviar, não dá para cancelar.
            </p>
          </div>
        </div>

        <div>
          <p className="text-sm uppercase tracking-wider text-faint mb-1.5">Assunto</p>
          <p className="text-xl font-display font-bold text-fg">{titulo.trim() || 'Sem título'}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Resumo
            icon={Users}
            valor={destinatarios.length}
            rotulo={destinatarios.length === 1 ? 'pessoa recebe' : 'pessoas recebem'}
          />
          <Resumo icon={ImageIcon} valor={fotos} rotulo={fotos === 1 ? 'foto' : 'fotos'} />
          <Resumo icon={Video} valor={videos} rotulo={videos === 1 ? 'vídeo' : 'vídeos'} />
          <Resumo icon={Link2} valor={links} rotulo={links === 1 ? 'link no texto' : 'links no texto'} />
        </div>

        <div className="rounded-lg border-2 border-edge overflow-hidden">
          <p className="px-5 py-3 border-b border-edge bg-edge/15 text-base font-semibold text-fg">
            Quem vai receber
          </p>
          <div className="max-h-56 overflow-y-auto overscroll-contain p-5">
            <p className="text-base text-muted leading-relaxed">
              {destinatarios.map(d => d.full_name || 'Sem nome').join(' · ')}
            </p>
          </div>
        </div>

        {pesado && (
          <div className="flex items-start gap-3.5 p-4 rounded-lg border-2 border-warning/40 bg-warning-soft">
            <AlertTriangle className="w-6 h-6 text-warning shrink-0 mt-0.5" />
            <p className="text-base text-muted">
              <strong className="font-semibold text-fg">
                As fotos somam {formatBytes(peso)} — está pesado.
              </strong>{' '}
              Se o envio falhar, volte e tire alguma foto, ou use imagens menores.
            </p>
          </div>
        )}
      </div>

      <div className="xl:sticky xl:top-2">
        <MessagePreview mensagem={mensagem} midias={midias} nomeExemplo={primeiroNome || 'Maria'} />
      </div>
    </div>
  );
}
