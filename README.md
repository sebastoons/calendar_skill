# LifeSkills Calendar

Panel privado para que el adulto organice un plan práctico de habilidades para la vida. No incluye una vista ni cuenta para el niño.

## Funciones incluidas
- Dashboard con progreso y próxima lección sugerida.
- 25 asignaturas, 5 áreas y 4 unidades por asignatura.
- Sugerencias de actividades prácticas orientadas a la vida diaria.
- Recomendador progresivo basado en estados, con control final del adulto.
- Calendario mensual y listado de actividades.
- Registro de observaciones y estados: no iniciado, necesita práctica, dominado, necesita ayuda.
- Guardado local en el navegador.
- Exportación e importación de respaldo JSON.
- Diseño adaptable a móviles.

## Ejecutar en tu computador
1. Instala Node.js (versión LTS).
2. Descomprime el proyecto.
3. Abre una terminal dentro de la carpeta `lifeskills-calendar`.
4. Ejecuta `npm install`.
5. Ejecuta `npm run dev` y abre la URL local que indique la terminal.

## Publicar en Netlify
1. Sube la carpeta del proyecto a un repositorio GitHub.
2. En Netlify, importa ese repositorio.
3. Build command: `npm run build`
4. Publish directory: `dist`

El archivo `public/_redirects` permite que la navegación de la aplicación funcione al refrescar la página.

## Importante sobre los datos
La primera versión guarda los datos en el almacenamiento local del navegador. No se sincronizan automáticamente entre dispositivos ni son una base de datos en la nube. Exporta periódicamente un respaldo desde Configuración. Si borras los datos del navegador, podrías perder los registros locales.

## Enfoque educativo
Las actividades son sugerencias para adaptar a la edad, intereses, supervisión y contexto familiar. En temas de seguridad, salud, herramientas, cocina y mecánica, prioriza prevención y supervisión adulta. La aplicación recomienda; el adulto decide cuándo avanzar.
