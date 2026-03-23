# PIX100

Aplicativo ágil, seguro e inteligente para a geração de cobranças PIX, Copia e Cola e QR Codes na velocidade da luz. Criado em Angular 21 com DaisyUI e TailwindCSS.

## 🚀 Funcionalidades

- **Gerador de PIX**: Criação instantânea de QR Code e "PIX Copia e Cola" contendo o TXID, Valor e Descrição.
- **Perfil / Configurações**: Perfis persistentes no navegador para preenchimento rápido.
  - Suporte inteligente à **Chave PIX**, com máscaras nativas para **CPF/CNPJ**, **Telefone** e **E-mail** usando a biblioteca `Maskito`, garantindo o PIX sempre formatado corretamente.
- **Tema Escuro (Dark Mode)**: Chaveamento limpo entre os temas Escuro e Claro através do `Theme Controller` do DaisyUI, com persistência ativada.
- **PWA Ready**: Cache completo através do Angular Service Worker (`@angular/service-worker`), operando 100% offline se instalado no celular como um app nativo.
- **Compartilhamento Nativo Inteligente**: O envio pelo WhatsApp não perde dados! Utilização da `Web Share API` juntamente com um *Fallback Automático* para a "Área de Transferência" (Garantindo que o "Pix Copia e Cola" chegue intacto ao recebedor da imagem).

## 🛠️ Tecnologias

- [Angular 21](https://angular.dev/) (Standalone Components e Signals API)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [DaisyUI 5](https://daisyui.com/)
- [Maskito](https://maskito.dev/) para lidar com máscaras avançadas.
- Biblioteca `pix-utils` para a montagem do payload e geração do QR Code Base64 criptografado.

## 🖥️ Como rodar localmente

Instale as dependências:

```bash
npm install
```

Inicie o servidor de desenvolvimento:

```bash
ng serve
```

Acesse `http://localhost:4200` no navegador. O *"Hot Reload"* refletirá mudanças nos arquivos automaticamente.

## 📦 Build e Compilação para Produção

Para fechar o pacote final com otimizações extremas para a pasta `dist/pix100`:

```bash
ng build --configuration production
```
