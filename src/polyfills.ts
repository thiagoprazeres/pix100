// Polyfill para Buffer (necessário para pix-utils)
import { Buffer } from 'buffer';
(window as any).Buffer = Buffer;
