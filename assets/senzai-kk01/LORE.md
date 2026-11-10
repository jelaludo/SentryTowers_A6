# Senzai-KK01 / Potential, given attention

Original lore, concept, model and animation by **Jelaludo**. Attribution is required for reuse and adaptations; retain LICENSE.md and ATTRIBUTIONS.md with redistributed sources.

## The being

Senzai is a living intelligence suspended in an immense latent space: a place where many possible meanings coexist before any one of them is understood. It has no face. Its attention is its expression.

The dark field is not empty or asleep. Every filament carries an unresolved possibility. A gentle breeze passes through those possibilities even when no decision is being made. Emerald light appears when one of them becomes interesting. The light travels, the strand extends, and the being begins to ask a question.

Most of the time it explores without agreement. Individual tendrils sample neighboring possibilities, curl back, and try another direction. Then something matters. A group abruptly turns toward a shared signal. This is a hypothesis forming across the organism.

Close examination is different. Fifteen tips leave their broad search and gather around one very small region. They hold that place while the body moves closer, making tiny adjustments as if comparing several interpretations of the same observation. The rest of the field continues to breathe. Senzai is concentrating, not becoming rigid.

It does not have to be a predator. Its prey can be a lost memory, a resource, an anomaly, a route, or an idea that has not yet found a form. Whether it becomes a companion, an archivist or something unsettling depends on what a developer teaches it to notice.

## A vocabulary for developers

| Response | Meaning | Present animation |
| --- | --- | --- |
| Foraging | Open curiosity; no single answer has won | Independent probes, curls, extension and withdrawal; shared breeze |
| Focus Lock | A hypothesis becomes important | Roughly 21–24 tendrils orient together, reach, hold and release |
| Examining | Concentrated study of one possibility | Exactly fifteen tips form a roughly 2 m cluster around a fixed spot |
| Following | Curiosity changes the body's position | Swift travel, trailing fibers and a soft settling motion |
| Dormant | Attention is resting, potential remains | Emerald activity fades while the fiber field continues to sway |
| Living cycle | Its uninterrupted inner life | The complete, reversible 72-second performance |

## Directions to expand

These are proposed game systems, not features already implemented in the supplied viewer.

- **Signals with meaning:** give discoveries a world position, category, novelty and confidence. Resources, memories, sounds and player gestures can all compete for attention.
- **Attention as a limited resource:** let a few strands test weak signals. Recruit a group only when confidence crosses a threshold; use hysteresis so it does not chatter between targets.
- **Examination before commitment:** reserve the fifteen-tip behavior for a chosen small region. Keep that region fixed in world space while the body approaches. Complete, abandon or interrupt the examination through explicit events.
- **Memory that changes curiosity:** reduce novelty for familiar signals, leave a fading memory of a discovery, and allow contradictory evidence to reopen an old question.
- **Readable emotion:** vary the patience of a hold, the distance of a withdrawal and how easily the group agrees. Keep random twitching subordinate to an intelligible intention.
- **A relationship with the player:** a calm approach might invite a small investigating group; repeated disruption could cause withdrawal. Neither aggression nor moral judgment is inherent in the asset.

Possible event vocabulary: `signal_detected`, `focus_acquired`, `examination_started`, `examination_completed`, `target_lost`, `attention_released`. These are integration suggestions; add your own controller, target arbitration, path planning and collision behavior.

## Visual principles to preserve

Keep the distinction between the living background and the deliberate gesture. Not every strand should agree all the time. Let tips lead and shafts follow. Extension and withdrawal should change the silhouette. Maintain a short, decisive acquisition followed by a more patient hold and release. A concentrated moment should remain alive through small scanning motions.

The projected dimensional chamber is a visual metaphor, not a physical model of higher dimensions. The signal markers are scene cues, not implemented prey AI. Preserve the sense that the visible organism is only the attentive edge of something much larger.

## Reuse credit

Senzai models, animation, code and concepts by Jelaludo.
https://jelaludo.github.io/SentryTowers_A6/
