# Configuración de Variables de Entorno

Para que la funcionalidad de alertas de stock crítico funcione correctamente, necesitas configurar las siguientes variables de entorno.

## Pasos

1. **Crea un archivo `.env.local`** en la raíz del proyecto (al lado de `package.json`)

2. **Agrega las siguientes variables**

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=tu_url_supabase
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# Resend API Key (para envío de emails)
RESEND_API_KEY=tu_resend_api_key
```

## Cómo obtener las claves

### Supabase

1. Ve a https://supabase.com
2. Abre tu proyecto
3. Ve a **Settings > API**
4. Copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `Service Role Secret` → `SUPABASE_SERVICE_ROLE_KEY`

### Resend

1. Ve a https://resend.com
2. Crea una cuenta o inicia sesión
3. Ve a **API Keys**
4. Copia tu API Key → `RESEND_API_KEY`

## Notas

- El archivo `.env.local` está en `.gitignore`, así que no se subirá a Git
- Después de crear/modificar `.env.local`, reinicia el servidor de desarrollo
- Asegúrate de que las claves sean válidas, de lo contrario los emails no se enviarán

## Verificación

Si ves el error "RESEND_API_KEY no está configurada", significa que necesitas agregar esta variable al archivo `.env.local`.
