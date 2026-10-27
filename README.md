# E-Redes token for Home Assistant

A small Chrome extension for users of the
[E-REDES integration for Home Assistant](https://github.com/mrfyda/ha-eredes).

E-Redes access tokens expire after about 90 minutes and cannot be renewed by a
script: the Balcão Digital login is protected by reCAPTCHA. Renewing meant
logging in, opening the browser's developer tools, copying the `aat` cookie and
pasting it into Home Assistant. This extension does the copying for you: **log
in to [balcaodigital.e-redes.pt](https://balcaodigital.e-redes.pt) as usual and
the fresh token is sent to Home Assistant.** The integration then fetches the
data it missed while the token was expired.

It does not bypass the login or the captcha: you still log in yourself.

*Versão em português abaixo.*

## Install

1. Download this repository (Code → Download ZIP) and unzip it.
2. Open `chrome://extensions` and turn on **Developer mode** (top right).
3. **Load unpacked** → select the `extension` folder.

## Set up

1. In Home Assistant: your profile → **Security** → **Long-lived access tokens**
   → **Create token** (for example `eredes-chrome`) and copy it. The user must
   be an administrator: the token is delivered through the integration's
   reconfigure step.
2. Right-click the extension icon → **Options**: enter your Home Assistant
   address (for example `http://homeassistant.local:8123`) and the token →
   **Save**. Chrome asks you to allow access to that address.

## Use

- Log in to balcaodigital.e-redes.pt. The token is sent automatically.
- Or click the extension icon: while logged in it sends the current token;
  otherwise it opens the [login page](https://balcaodigital.e-redes.pt/login).

The icon shows the result: **OK** (accepted; hover for when it expires),
**EXP** (the token has expired, about 90 minutes after login: Home Assistant
cannot fetch until you log in again), **ERR** (hover for the reason), **?** (not
logged in to E-Redes) or **SET** (not configured yet). A desktop
notification is shown as well when your system allows it.

Home Assistant validates the token before saving it. With the current
integration that takes about a minute, because validation fetches data from
E-Redes; the icon shows **...** meanwhile.

## How it works

When the `aat` cookie of `e-redes.pt` changes (Chrome's `cookies` API), the
extension calls Home Assistant's REST API: it starts the E-REDES integration's
*reconfigure* flow, keeps the CPE the integration already has, and submits the
new token.

## Privacy and permissions

- `cookies` for `e-redes.pt`: to read the `aat` token after you log in.
- The one Home Assistant address you enter (requested when you save).
- `storage`: keeps that address and your Home Assistant token on your computer.
- `notifications`: to tell you the result.
- `alarms`: to switch the icon to EXP when the token expires.

The token goes only to your Home Assistant. There is no other network access,
analytics or tracking. See [SECURITY.md](SECURITY.md) to report a problem.

## Development

```bash
npm run check   # syntax check
npm test        # unit tests (Node 24, no dependencies)
```

## License

Apache License 2.0 — see [LICENSE](LICENSE).

---

## Português

Uma pequena extensão para o Chrome para quem usa a
[integração E-REDES para o Home Assistant](https://github.com/mrfyda/ha-eredes).

Os tokens de acesso da E-Redes expiram ao fim de cerca de 90 minutos e não
podem ser renovados por um script: o login do Balcão Digital está protegido por
reCAPTCHA. Renovar obrigava a fazer login, abrir as ferramentas de
programador do browser, copiar o cookie `aat` e colá-lo no Home Assistant. Esta
extensão faz a cópia por si: **faça login em
[balcaodigital.e-redes.pt](https://balcaodigital.e-redes.pt) como de costume e o
token novo é enviado para o Home Assistant.** A integração vai depois buscar os
dados em falta.

Não contorna o login nem o captcha: o login continua a ser feito por si.

### Instalar

1. Descarregue este repositório (Code → Download ZIP) e descompacte-o.
2. Abra `chrome://extensions` e ative o **Modo de programador** (canto superior direito).
3. **Carregar expandida** → escolha a pasta `extension`.

### Configurar

1. No Home Assistant: o seu perfil → **Segurança** → **Tokens de acesso de longa
   duração** → **Criar token** (por exemplo `eredes-chrome`) e copie-o. O
   utilizador tem de ser administrador.
2. Clique com o botão direito no ícone da extensão → **Opções**: endereço do
   Home Assistant (por exemplo `http://homeassistant.local:8123`) e o token →
   **Guardar**. O Chrome pede autorização para aceder a esse endereço.

### Utilizar

- Faça login em balcaodigital.e-redes.pt: o token é enviado automaticamente.
- Ou clique no ícone da extensão: com a sessão iniciada envia o token atual;
  caso contrário abre a [página de login](https://balcaodigital.e-redes.pt/login).

O ícone mostra o resultado: **OK** (aceite; passe o rato para ver quando
expira), **EXP** (o token expirou, cerca de 90 minutos após o login: o Home
Assistant só volta a obter dados depois de novo login), **ERR** (passe o rato
para ver o motivo), **?** (sem sessão na E-Redes) ou **SET** (ainda não
configurada).

O Home Assistant valida o token antes de o guardar. Com a versão atual da
integração isso demora cerca de um minuto, porque a validação vai buscar dados
à E-Redes; entretanto o ícone mostra **...**.

### Privacidade

O token só é enviado para o seu Home Assistant. Não há outros acessos à rede,
estatísticas ou rastreio.

### Licença

Apache License 2.0 — ver [LICENSE](LICENSE).
