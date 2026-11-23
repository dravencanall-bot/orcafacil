# OrçaFechou

App de orçamento e recibo para profissionais autônomos (eletricista, pintor, diarista...).
O profissional monta o orçamento, manda pelo WhatsApp, o cliente abre no celular, aprova e paga por Pix.

## O que já funciona (versão 1)
- Cadastro dos dados do profissional (nome, WhatsApp, cidade, logo, cor, chave Pix)
- Criar, editar e apagar orçamentos e recibos, com total automático e desconto
- Enviar pelo WhatsApp com mensagem pronta e link
- Página do cliente: ver o orçamento, aprovar pelo WhatsApp, pagar por Pix (QR Code + copia e cola com valor)
- Recibo com valor por extenso e linha de assinatura
- Baixar PDF (pela opção de imprimir do celular/computador)
- Situação de cada orçamento (enviado, aprovado, pago) e total aprovado no mês
- Instalável na tela inicial do celular (PWA)

## Limitações conhecidas (vêm na fase 2)
- Os dados ficam só no aparelho do profissional. Se trocar de celular ou limpar o navegador, perde. (Fase 2: conta online com Supabase.)
- O link do orçamento é comprido porque os dados vão dentro dele. (Fase 2: link curto.)
- Ainda não tem plano pago nem limite grátis. (Fase 2: plano Pro por Pix.)

## Para programadores
```
npm install
npm run dev      # abre em http://localhost:5173
npm run build    # gera a pasta dist/ para publicar
```
Feito com React + Vite. Sem servidor: tudo roda no navegador.
