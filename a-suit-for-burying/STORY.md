# A Suit for Burying: series bible

An interactive Western in chapters. It borrows the **structure and themes** of Clint
Eastwood's *Unforgiven* (1992): a retired killer who promised his late wife he'd changed, a
bounty for a wrong the law let slide, a horse that won't carry the man he's becoming, an old
partner, a brutal lawman, and the moral cost of one last job. All characters, places, dialogue
and events here are original.

## The question

*Can a man put down what he was, and who pays when he picks it back up?*

Dove is the measure. She never knew Eli as a killer, so her trust tracks who he is becoming.
Every chapter asks the player to decide something about violence, honesty or mercy, and the
horse remembers.

## People

- **Eli Marrow**, early fifties. Eleven years ago he was the most feared gun in the
  territory (the Blackwater years, never fully told). He married Ada and locked his pistol in
  her cedar trunk. She died of fever in the winter of 1879. He buried her in his only suit and
  has worn it every day since. He talks little and lies badly.
- **Ada Marrow**, heard only in memory. She was not naive: she knew exactly what she
  married, and she bet on him anyway.
- **June Marrow**, 9. Sharp, sickly (a cough that won't quit), and more like her father than
  either of them admits. On the unarmed path she packs the pistol herself: *"You promised Ma.
  But I want you home more."*
- **Dove**, Ada's grey mare. Gentle with everyone but Eli, until he earns it.
- **Tobias Quill**, early twenties. A bounty rider who has read too many dime novels about
  Eli. He brags about kills he has never made (to be revealed in Chapter 3).
- **Marshal Hollis Grady** of Calvary Bend. Keeps the peace with fear and a strict no-guns law.
  He fined the two drovers who cut Maggie Lowe a pony apiece, and he considers that justice.
- **Maggie Lowe**, the laundress who was cut. The women of the Bend pooled $1,000.
- **The drovers**: **Cal Pruett**, who did it, and **Dell Pruett**, his younger brother, who
  only watched and has regretted it every day since. The bounty doesn't care which is which.
- **Sam Wick**, Eli's partner from the Blackwater years. Now keeps a trading post and a
  Comanche wife, and wants no part of it. Introduced in Chapter 3.

## State carried between chapters

Saved in `localStorage` under `a-suit-for-burying:v1`:

| Key | Values | Set in Chapter 1 by |
| --- | --- | --- |
| `resolve` | `willing` / `reluctant` | Hearing Tobias out, or sending him away |
| `armed` | `true` / `false` | Taking the gun, or leaving it in the trunk |
| `junePacked` | `true` / `false` | Leaving the gun (June packs it anyway) |
| `trust` | `high` / `low` | Speaking softly to Dove, or forcing her |
| `river` | `carried` / `struggled` / `thrown` | Holding or letting go in the flood (and `trust`) |
| `mercy` | `true` if Dove turned back for him | River outcome |

## Chapter 1: The Trunk (built)

The prologue at Ada's grave; Tobias and the bounty; the pistol in the shawl; Dove refusing
him; the ride; the flood; the ridge above Calvary Bend and Grady's sign. Four choices, three
flood outcomes, two ridge endings.

## Chapter 2: Calvary Bend (planned)

- Eli and Tobias ride into town in the rain. The gun law is enforced at the livery by
  Grady's deputies.
- ◆ **The gun.** If `armed`: hand it over, or hide it in Dove's saddlebag. If June packed
  it: Eli doesn't know how to tell Tobias it's there at all. Lying to Grady has
  consequences later.
- Grady finds out who Eli is. Set piece: **the beating in the rain** outside the saloon,
  lit by the saloon's lamps, with rain-streaked shadows on the boardwalk. Eli doesn't fight
  back. ◆ *Stay down* / *Get up*. Getting up costs more.
- Maggie Lowe tends him through a fever in a back room. She asks him whether the thousand
  dollars is worth a man's life. Her answer depends on whether he came `willing` or
  `reluctant`.
- If `trust` is high, Dove comes to the back window of the saloon at night, loose from the
  livery.
- **Cliffhanger:** Tobias comes back with news. He has found the Pruett brothers' camp, and
  Sam Wick is riding in to help.

## Chapter 3: What Sam Owed (planned)

- Sam Wick arrives. He was the better man in Blackwater, and both of them know it.
- The ambush at the Pruett camp in a canyon at dawn. ◆ Eli, Sam or Tobias takes the
  shot at **Dell**, the brother who only watched. Tobias's first killing breaks him: he never
  killed anyone before.
- Sam quits and rides home. Grady's men catch him on the road. ◆ *Follow Sam* / *Finish the
  job*. This choice decides whether Sam is still alive in Chapter 4.
- **Cliffhanger:** a rider brings word. Sam is dead, and he is on display outside Grady's
  saloon.

## Chapter 4: The Reckoning (planned)

- Eli drinks for the first time in eleven years. Whatever he was comes back.
- A storm night in the saloon, lit by a single hanging lamp: the action finale. The outcome
  and its cost depend on every choice so far: `armed`, `trust`, and whether he lied to Grady,
  got up in the rain, or followed Sam.
- **The last choice:** what Eli says to June, and whether he brings Dove home.
- Epilogue at Ada's grave, echoing the prologue. The cards say what became of them, and
  they are different for every player.
