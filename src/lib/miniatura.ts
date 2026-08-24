import { TipoMidia } from './whatsapp';

/** Lado maior da miniatura, em pixels. */
const LADO_MAXIMO = 320;
/** Qualidade do JPEG. 0.7 mantém a imagem reconhecível com poucos KB. */
const QUALIDADE = 0.7;

/**
 * Gera uma miniatura em base64 para o histórico.
 *
 * O arquivo original chega a ter megabytes e vai inteiro para o n8n, mas
 * guardar isso no banco encheria a tabela em poucos envios. A miniatura fica
 * em torno de 20 KB — o bastante para o admin reconhecer depois o que mandou.
 *
 * Devolve base64 puro (sempre JPEG), ou null se não der para gerar. Falhar
 * aqui não impede o envio: o histórico só mostra o nome do arquivo.
 */
export async function criarMiniatura(file: File, tipo: TipoMidia): Promise<string | null> {
  try {
    const quadro = tipo === 'imagem' ? await quadroDaImagem(file) : await quadroDoVideo(file);
    if (!quadro) return null;

    const { largura, altura } = escalar(quadro.width, quadro.height);
    const canvas = document.createElement('canvas');
    canvas.width = largura;
    canvas.height = altura;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(quadro.fonte, 0, 0, largura, altura);

    const dataUri = canvas.toDataURL('image/jpeg', QUALIDADE);
    return dataUri.slice(dataUri.indexOf(',') + 1);
  } catch (error) {
    console.error('Não foi possível gerar a miniatura:', error);
    return null;
  }
}

function escalar(largura: number, altura: number) {
  const maior = Math.max(largura, altura);
  if (maior <= LADO_MAXIMO) return { largura, altura };
  const fator = LADO_MAXIMO / maior;
  return { largura: Math.round(largura * fator), altura: Math.round(altura * fator) };
}

async function quadroDaImagem(file: File) {
  const bitmap = await createImageBitmap(file);
  return { fonte: bitmap as CanvasImageSource, width: bitmap.width, height: bitmap.height };
}

/** Captura o primeiro quadro visível do vídeo. */
function quadroDoVideo(file: File) {
  return new Promise<{ fonte: CanvasImageSource; width: number; height: number } | null>(resolve => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    let encerrado = false;

    const encerrar = (resultado: { fonte: CanvasImageSource; width: number; height: number } | null) => {
      if (encerrado) return;
      encerrado = true;
      URL.revokeObjectURL(url);
      resolve(resultado);
    };

    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';

    video.onloadeddata = () => {
      // O quadro em 0s costuma vir preto; avança um pouco antes de capturar.
      video.currentTime = Math.min(0.1, video.duration || 0);
    };

    video.onseeked = () => encerrar({ fonte: video, width: video.videoWidth, height: video.videoHeight });

    video.onerror = () => encerrar(null);
    // Vídeo problemático não pode travar a escolha do arquivo.
    setTimeout(() => encerrar(null), 5000);

    video.src = url;
  });
}
