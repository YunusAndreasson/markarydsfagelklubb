/**
 * Visningsförhållande för ett observationsfoto — Instagram-modellen: visa bilden
 * SÅ SOM DEN TOGS, men klampad till ett intervall så att en extrem bild varken
 * blir en tunn remsa (panorama) eller trycker ut allt annat ur flödet (hög stående).
 *
 * Bakgrund: observationsfoton lagras OBESKURNA — `normalizeImage` skalar bara ner
 * längsta sidan (`src/lib/image.ts`), och `allowsEditing` är av för rektangulära
 * bilder. Kortet renderade ändå varje foto i en fast 4:3-ruta med
 * `contentFit="cover"`, vilket mittbeskär allt som inte råkar vara 4:3. Ett stående
 * mobilfoto (3:4) tappade ~44 % av sin höjd, och en fågel nära kanten kunde
 * beskäras bort helt — i en app där bilden ÄR fyndbeviset.
 *
 * Gränserna är Instagrams egna: 1.91:1 liggande och 4:5 stående. 4:5 är det
 * högsta formatet som tillåts i flödet just för att det tar mest skärmyta.
 */
import { useState } from 'react'

import type { ImageLoadEventData } from 'expo-image'

/** Bredast tillåtna (liggande). Bredare än så beskärs i sidled. */
export const ASPECT_WIDEST = 1.91
/** Högst tillåtna (stående 4:5). Högre än så beskärs i höjdled. */
export const ASPECT_TALLEST = 4 / 5
/** Reserverad yta innan bildens verkliga mått är kända — appens tidigare format. */
export const ASPECT_DEFAULT = 4 / 3

export function clampAspect(width: number, height: number): number {
  return Math.min(ASPECT_WIDEST, Math.max(ASPECT_TALLEST, width / height))
}

/**
 * Ger `aspectRatio` för bildrutan plus den `onLoad` som mäter upp den. Tills
 * bilden laddats reserveras {@link ASPECT_DEFAULT}, så layouten har en höjd att
 * utgå från. Cachen är memory-disk, så hoppet syns bara första gången ett foto
 * hämtas — därefter är måtten kända direkt.
 */
export function useImageAspect(initial: number = ASPECT_DEFAULT) {
  const [aspect, setAspect] = useState(initial)

  function onLoad(event: ImageLoadEventData) {
    const { width, height } = event.source
    if (!width || !height) return
    setAspect(clampAspect(width, height))
  }

  return { aspect, onLoad }
}
