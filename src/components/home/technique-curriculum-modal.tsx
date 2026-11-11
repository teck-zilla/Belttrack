'use client';

import React, { useState } from 'react';
import { useAccessibleModal } from './use-accessible-modal';
import { useTenant } from '@/context/tenant-context';
import { useAuth } from '@/context/auth-context';
import type { DisciplineType } from '@/types/domain';

export interface CurriculumTechniqueItem {
  id: string;
  name: string;
  traditionalName?: string;
  category: string;
  discipline: DisciplineType;
  beltRank: string;
  description: string;
  isMandatory: boolean;
  status: 'verified' | 'in_progress' | 'not_started';
  verifiedBy?: string;
  verifiedAt?: string;
}

const DEFAULT_CURRICULA: Record<DisciplineType, { trackName: string; beltName: string; techniques: CurriculumTechniqueItem[] }> = {
  brazilian_jiu_jitsu: {
    trackName: 'Adult BJJ Gi Track',
    beltName: 'White Belt (3 Stripes) -> Blue Belt Criteria',
    techniques: [
      {
        id: 'bjj-1',
        name: 'Scissor Sweep',
        traditionalName: 'Raspagem de Tesoura',
        category: 'Guard Sweep',
        discipline: 'brazilian_jiu_jitsu',
        beltRank: 'White Belt',
        description: 'Shin across chest line with collar-sleeve grips, loading hips and kicking bottom leg to sweep to mount.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Coach Marcus',
        verifiedAt: '2026-10-14'
      },
      {
        id: 'bjj-2',
        name: 'Hip Bump Sweep (Kimura Threat)',
        traditionalName: 'Raspagem de Quadril',
        category: 'Guard Sweep',
        discipline: 'brazilian_jiu_jitsu',
        beltRank: 'White Belt',
        description: 'Sit up from closed guard to over-hook shoulder; hip bump forward or transition to Kimura upon post.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Coach Marcus',
        verifiedAt: '2026-10-18'
      },
      {
        id: 'bjj-3',
        name: 'Armbar from Closed Guard',
        traditionalName: 'Chave de Braço da Guarda',
        category: 'Submission',
        discipline: 'brazilian_jiu_jitsu',
        beltRank: 'White Belt',
        description: '2-on-1 tricep control, foot on hip angle cut, leg across back, pinching knees with thumb pointed up.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Coach Marcus',
        verifiedAt: '2026-10-22'
      },
      {
        id: 'bjj-4',
        name: 'Triangle Choke Setup & Finish',
        traditionalName: 'Triângulo Fechado',
        category: 'Submission',
        discipline: 'brazilian_jiu_jitsu',
        beltRank: 'White Belt',
        description: '1-in 1-out wrist control, shoot hips high, lock figure-4 over shin with shoulder cut angle.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Coach Elena',
        verifiedAt: '2026-10-25'
      },
      {
        id: 'bjj-5',
        name: 'Cross Collar Choke from Mount',
        traditionalName: 'Estrangulamento Cruzado',
        category: 'Submission',
        discipline: 'brazilian_jiu_jitsu',
        beltRank: 'White Belt',
        description: 'Deep first grip behind neck, second hand under or over, forearms rotate to compress carotids.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Coach Marcus',
        verifiedAt: '2026-10-29'
      },
      {
        id: 'bjj-6',
        name: 'Torreando Guard Pass',
        traditionalName: 'Passagem de Toureiro',
        category: 'Guard Pass',
        discipline: 'brazilian_jiu_jitsu',
        beltRank: 'White Belt',
        description: 'Pant cuff grips, redirect knees past hip line, pin legs to mat, and transition chest-to-chest to side control.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Coach Elena',
        verifiedAt: '2026-11-02'
      },
      {
        id: 'bjj-7',
        name: 'Knee Slice Guard Pass',
        traditionalName: 'Passagem Cortando Joelho',
        category: 'Guard Pass',
        discipline: 'brazilian_jiu_jitsu',
        beltRank: 'White Belt',
        description: 'Underhook far side, cross-face pressure, slice shin diagonally across opponent thigh to mount or side control.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Coach Marcus',
        verifiedAt: '2026-11-05'
      },
      {
        id: 'bjj-8',
        name: 'Elbow-Escape / Shrimping from Mount',
        traditionalName: 'Saída de Cotovelo da Montada',
        category: 'Escape',
        discipline: 'brazilian_jiu_jitsu',
        beltRank: 'White Belt',
        description: 'Frame on belt line, bridge and shrimp on hip to recover half guard, then insert knee shield to full guard.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Coach Elena',
        verifiedAt: '2026-11-08'
      },
      {
        id: 'bjj-9',
        name: 'Kimura from Guard & Side Control',
        traditionalName: 'Chave Dupla de Braço (Kimura)',
        category: 'Submission',
        discipline: 'brazilian_jiu_jitsu',
        beltRank: 'White Belt',
        description: 'Double wrist lock figure-4 grip, break 90-degree angle, rotate arm behind back towards shoulder blades.',
        isMandatory: true,
        status: 'in_progress',
        verifiedBy: undefined,
        verifiedAt: undefined
      },
      {
        id: 'bjj-10',
        name: 'Rear Naked Choke (Mata Leão)',
        traditionalName: 'Mata Leão',
        category: 'Submission',
        discipline: 'brazilian_jiu_jitsu',
        beltRank: 'White Belt',
        description: 'Seatbelt grip transition, elbow under chin, bicep grip, hand behind opponent neck without head push.',
        isMandatory: true,
        status: 'not_started',
        verifiedBy: undefined,
        verifiedAt: undefined
      }
    ]
  },
  karate: {
    trackName: 'Traditional Shotokan Karate Syllabus',
    beltName: 'White Belt (9th Kyu) -> Yellow Belt (8th Kyu) Criteria',
    techniques: [
      {
        id: 'kt-1',
        name: 'Oi-Tsuki (Lunge Punch)',
        traditionalName: '追い突き',
        category: 'Kihon / Tsuki',
        discipline: 'karate',
        beltRank: 'White Belt',
        description: 'Stepping forward in Zenkutsu-Dachi (front stance) delivering a straight punch with full hip drive.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Sensei Tanaka',
        verifiedAt: '2026-10-15'
      },
      {
        id: 'kt-2',
        name: 'Gyaku-Tsuki (Reverse Punch)',
        traditionalName: '逆突き',
        category: 'Kihon / Tsuki',
        discipline: 'karate',
        beltRank: 'White Belt',
        description: 'Punching with the rear hand while anchored in Zenkutsu-Dachi, rotating hips 45 degrees into target.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Sensei Tanaka',
        verifiedAt: '2026-10-19'
      },
      {
        id: 'kt-3',
        name: 'Age-Uke (Rising High Block)',
        traditionalName: '上げ受け',
        category: 'Kihon / Uke',
        discipline: 'karate',
        beltRank: 'White Belt',
        description: 'Upward forearm deflection protecting temple and forehead, chambered from opposite hip with wrist rotation.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Sensei Tanaka',
        verifiedAt: '2026-10-23'
      },
      {
        id: 'kt-4',
        name: 'Gedan-Barai (Downward Block)',
        traditionalName: '下段払い',
        category: 'Kihon / Uke',
        discipline: 'karate',
        beltRank: 'White Belt',
        description: 'Sweeping downward forearm block defending against front kicks, chambering from opposite ear to lower knee.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Sensei Tanaka',
        verifiedAt: '2026-10-27'
      },
      {
        id: 'kt-5',
        name: 'Soto-Uke (Outside Forearm Block)',
        traditionalName: '外受け',
        category: 'Kihon / Uke',
        discipline: 'karate',
        beltRank: 'White Belt',
        description: 'Inward deflection of mid-section attacks, forearm traveling from outside ear level into vertical center line.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Sensei Tanaka',
        verifiedAt: '2026-10-31'
      },
      {
        id: 'kt-6',
        name: 'Uchi-Uke (Inside Forearm Block)',
        traditionalName: '内受け',
        category: 'Kihon / Uke',
        discipline: 'karate',
        beltRank: 'White Belt',
        description: 'Deflecting outward from opposite hip across ribs in Kokutsu-Dachi (back stance).',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Sensei Tanaka',
        verifiedAt: '2026-11-03'
      },
      {
        id: 'kt-7',
        name: 'Mae-Geri (Front Snap Kick)',
        traditionalName: '前蹴り',
        category: 'Kihon / Keri',
        discipline: 'karate',
        beltRank: 'White Belt',
        description: 'Knee chamber to solar plexus, striking with Koshi (ball of foot), and immediate snapback recovery.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Sensei Tanaka',
        verifiedAt: '2026-11-06'
      },
      {
        id: 'kt-8',
        name: 'Heian Shodan (Kata 1 - Peaceful Mind)',
        traditionalName: '平安初段',
        category: 'Kata / Form',
        discipline: 'karate',
        beltRank: 'White Belt',
        description: '21-count formal sequence incorporating Gedan-Barai, Oi-Tsuki, Age-Uke, and Shuto-Uke across the I-embusen.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Sensei Tanaka',
        verifiedAt: '2026-11-09'
      },
      {
        id: 'kt-9',
        name: 'Mawashi-Geri (Roundhouse Kick)',
        traditionalName: '回し蹴り',
        category: 'Kihon / Keri',
        discipline: 'karate',
        beltRank: 'White Belt',
        description: 'Horizontal hip rotation striking with the instep (Haisoku) or ball of foot at Chudan level.',
        isMandatory: true,
        status: 'in_progress',
        verifiedBy: undefined,
        verifiedAt: undefined
      },
      {
        id: 'kt-10',
        name: 'Gohon Kumite (Five-Step Sparring)',
        traditionalName: '五本組手',
        category: 'Kumite / Sparring',
        discipline: 'karate',
        beltRank: 'White Belt',
        description: 'Basic pre-arranged five-step sparring testing distance (Ma-ai), timing, eye focus, and counter-attacks.',
        isMandatory: true,
        status: 'not_started',
        verifiedBy: undefined,
        verifiedAt: undefined
      }
    ]
  },
  taekwondo: {
    trackName: 'WT / Olympic Taekwondo Curriculum',
    beltName: 'White Belt (10th Geup) -> Yellow Belt (8th Geup) Criteria',
    techniques: [
      {
        id: 'tkd-1',
        name: 'Ap Chagi (Front Snap Kick)',
        traditionalName: '앞차기',
        category: 'Chagi / Kicks',
        discipline: 'taekwondo',
        beltRank: 'White Belt',
        description: 'High knee chamber, snapping forward with the ball of foot (Apchuk) directed at mid or high section.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Master Kim',
        verifiedAt: '2026-10-15'
      },
      {
        id: 'tkd-2',
        name: 'Dollyo Chagi (Roundhouse Kick)',
        traditionalName: '돌려차기',
        category: 'Chagi / Kicks',
        discipline: 'taekwondo',
        beltRank: 'White Belt',
        description: 'Pivoting on support foot 90-180 degrees, snapping hip over to strike with the instep (Baldeung).',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Master Kim',
        verifiedAt: '2026-10-19'
      },
      {
        id: 'tkd-3',
        name: 'Yeop Chagi (Side Piercing Kick)',
        traditionalName: '옆차기',
        category: 'Chagi / Kicks',
        discipline: 'taekwondo',
        beltRank: 'White Belt',
        description: 'Chambering knee across torso, thrusting hip forward and striking with the blade edge of the foot (Dwichuk).',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Master Kim',
        verifiedAt: '2026-10-23'
      },
      {
        id: 'tkd-4',
        name: 'Arae Makgi (Low Block)',
        traditionalName: '아래막기',
        category: 'Makgi / Blocks',
        discipline: 'taekwondo',
        beltRank: 'White Belt',
        description: 'Chamber from opposite shoulder downward, stopping two fists above the front knee in Ap Seogi stance.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Master Kim',
        verifiedAt: '2026-10-27'
      },
      {
        id: 'tkd-5',
        name: 'Momtong An Makgi (Middle Inside Block)',
        traditionalName: '몸통안막기',
        category: 'Makgi / Blocks',
        discipline: 'taekwondo',
        beltRank: 'White Belt',
        description: 'Outer forearm travels inward to center solar plexus, defending against incoming straight body strikes.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Master Kim',
        verifiedAt: '2026-10-31'
      },
      {
        id: 'tkd-6',
        name: 'Olgul Makgi (High Rising Block)',
        traditionalName: '얼굴막기',
        category: 'Makgi / Blocks',
        discipline: 'taekwondo',
        beltRank: 'White Belt',
        description: 'Rising block positioned at 45 degrees one fist above forehead, deflecting downward head strikes.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Master Kim',
        verifiedAt: '2026-11-03'
      },
      {
        id: 'tkd-7',
        name: 'Momtong Jireugi (Middle Torso Punch)',
        traditionalName: '몸통지르기',
        category: 'Jireugi / Strikes',
        discipline: 'taekwondo',
        beltRank: 'White Belt',
        description: 'Straight punch from Ap Gubi (forward stance) with sharp corkscrew wrist rotation at point of impact.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Master Kim',
        verifiedAt: '2026-11-06'
      },
      {
        id: 'tkd-8',
        name: 'Taegeuk 1 Jang (Heaven & Spring Pattern)',
        traditionalName: '태극 1장 (건)',
        category: 'Poomsae / Pattern',
        discipline: 'taekwondo',
        beltRank: 'White Belt',
        description: 'First official Poomsae representing Keon (Heaven), executing 18 movements of Arae Makgi, Momtong Jireugi, and Ap Chagi.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Master Kim',
        verifiedAt: '2026-11-09'
      },
      {
        id: 'tkd-9',
        name: 'Naeryeo Chagi (Axe Kick)',
        traditionalName: '내려차기',
        category: 'Chagi / Kicks',
        discipline: 'taekwondo',
        beltRank: 'White Belt',
        description: 'Swinging leg high above head and driving downward with the heel into target.',
        isMandatory: true,
        status: 'in_progress',
        verifiedBy: undefined,
        verifiedAt: undefined
      },
      {
        id: 'tkd-10',
        name: 'Hanbeon Gyeorugi (One-Step Sparring)',
        traditionalName: '한번겨루기',
        category: 'Gyeorugi / Sparring',
        discipline: 'taekwondo',
        beltRank: 'White Belt',
        description: 'Pre-arranged self-defense reaction against single punch: evasion, counter-kick, and control.',
        isMandatory: true,
        status: 'not_started',
        verifiedBy: undefined,
        verifiedAt: undefined
      }
    ]
  },
  judo: {
    trackName: 'Kodokan Judo Gokyo Syllabus',
    beltName: 'White Belt (6th Kyu) -> Yellow Belt (5th Kyu) Criteria',
    techniques: [
      {
        id: 'jud-1',
        name: 'O-Goshi (Major Hip Throw)',
        traditionalName: '大腰',
        category: 'Koshi-Waza',
        discipline: 'judo',
        beltRank: 'White Belt',
        description: 'Hand wraps around opponent waist, pull onto hip with bent knees, rotate torso to elevate and throw.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Sensei Kano',
        verifiedAt: '2026-10-15'
      },
      {
        id: 'jud-2',
        name: 'Ippon Seoi Nage (One-Arm Shoulder Throw)',
        traditionalName: '一本背負投',
        category: 'Te-Waza',
        discipline: 'judo',
        beltRank: 'White Belt',
        description: 'Clamp armpit over opponent upper arm, pivot 180 degrees into low stance, load across back and throw.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Sensei Kano',
        verifiedAt: '2026-10-19'
      },
      {
        id: 'jud-3',
        name: 'Osoto Gari (Major Outer Reap)',
        traditionalName: '大外刈',
        category: 'Ashi-Waza',
        discipline: 'judo',
        beltRank: 'White Belt',
        description: 'Off-balance to rear corner with chest-to-chest contact, sweep planting leg behind knee.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Sensei Kano',
        verifiedAt: '2026-10-23'
      },
      {
        id: 'jud-4',
        name: 'Deashi Harai (Forward Foot Sweep)',
        traditionalName: '出足払',
        category: 'Ashi-Waza',
        discipline: 'judo',
        beltRank: 'White Belt',
        description: 'Timing sweep of the leading foot as it takes weight, catching the ankle sideways.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Sensei Kano',
        verifiedAt: '2026-10-27'
      },
      {
        id: 'jud-5',
        name: 'Kesa Gatame (Scarf Hold Pin)',
        traditionalName: '袈裟固',
        category: 'Osaekomi-Waza',
        discipline: 'judo',
        beltRank: 'White Belt',
        description: 'Chest wraps over torso, control under neck and tricep, spread base with wide legs and low hips.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Sensei Kano',
        verifiedAt: '2026-10-31'
      },
      {
        id: 'jud-6',
        name: 'Yoko Shiho Gatame (Side Four-Quarter Pin)',
        traditionalName: '横四方固',
        category: 'Osaekomi-Waza',
        discipline: 'judo',
        beltRank: 'White Belt',
        description: 'Perpendicular chest pin with arm between opponent legs and hand securing deep collar.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Sensei Kano',
        verifiedAt: '2026-11-03'
      },
      {
        id: 'jud-7',
        name: 'Mae Ukemi (Forward Breakfall)',
        traditionalName: '前受身',
        category: 'Ukemi / Breakfall',
        discipline: 'judo',
        beltRank: 'White Belt',
        description: 'Dissipating impact using forearms and palms at 45-degree angle without letting knees touch.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Sensei Kano',
        verifiedAt: '2026-11-06'
      },
      {
        id: 'jud-8',
        name: 'Ushiro Ukemi (Rear Breakfall)',
        traditionalName: '後ろ受身',
        category: 'Ukemi / Breakfall',
        discipline: 'judo',
        beltRank: 'White Belt',
        description: 'Chin tucked tightly to chest, rolling back and slapping mat with arms at 30-degree angles.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Sensei Kano',
        verifiedAt: '2026-11-09'
      },
      {
        id: 'jud-9',
        name: 'Seoi Otoshi (Shoulder Drop)',
        traditionalName: '背負落',
        category: 'Te-Waza',
        discipline: 'judo',
        beltRank: 'White Belt',
        description: 'Dropping to one or both knees beneath opponent center of gravity to pull and rotate over shoulder.',
        isMandatory: true,
        status: 'in_progress',
        verifiedBy: undefined,
        verifiedAt: undefined
      },
      {
        id: 'jud-10',
        name: 'Kuzushi & Tsukuri Principles',
        traditionalName: '崩しと作り',
        category: 'Foundations',
        discipline: 'judo',
        beltRank: 'White Belt',
        description: 'Demonstrating 8-directional off-balancing (Happo-no-Kuzushi) prior to throw entry.',
        isMandatory: true,
        status: 'not_started',
        verifiedBy: undefined,
        verifiedAt: undefined
      }
    ]
  },
  muay_thai: {
    trackName: 'Muay Thai Traditional Prajiad Level 1',
    beltName: 'White Prajiad -> Yellow Prajiad Criteria',
    techniques: [
      {
        id: 'mt-1',
        name: 'Mat Trong (Straight Jab & Cross)',
        traditionalName: 'หมัดตรง',
        category: 'Chok / Punches',
        discipline: 'muay_thai',
        beltRank: 'Level 1 Prajiad',
        description: 'Lead jab followed by rear power cross with chin tucked and opposite hand glued to guard temple.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Kru Samart',
        verifiedAt: '2026-10-15'
      },
      {
        id: 'mt-2',
        name: 'Te Chiang (Diagonal Body Roundhouse Kick)',
        traditionalName: 'เตะเฉียง',
        category: 'Te / Kicks',
        discipline: 'muay_thai',
        beltRank: 'Level 1 Prajiad',
        description: 'Full hip rotation through target with baseball bat mechanics, striking with lower shin bone.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Kru Samart',
        verifiedAt: '2026-10-19'
      },
      {
        id: 'mt-3',
        name: 'Teep Trong (Front Push Kick)',
        traditionalName: 'ถีบตรง',
        category: 'Te / Kicks',
        discipline: 'muay_thai',
        beltRank: 'Level 1 Prajiad',
        description: 'Chamber knee, thrust hips forward to spear ball of foot into opponent abdomen to stop forward rush.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Kru Samart',
        verifiedAt: '2026-10-23'
      },
      {
        id: 'mt-4',
        name: 'Khao Trong (Straight Knee Strike)',
        traditionalName: 'เข่าตรง',
        category: 'Ti Khao / Knees',
        discipline: 'muay_thai',
        beltRank: 'Level 1 Prajiad',
        description: 'Drive hips straight forward on ball of support foot, pointing toes down to harden knee spear.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Kru Samart',
        verifiedAt: '2026-10-27'
      },
      {
        id: 'mt-5',
        name: 'Sok Tad (Horizontal Elbow Slash)',
        traditionalName: 'ศอกตัด',
        category: 'Sok / Elbows',
        discipline: 'muay_thai',
        beltRank: 'Level 1 Prajiad',
        description: 'Short slicing elbow across jawline with hip pivot, hand touching chest to sharpen elbow point.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Kru Samart',
        verifiedAt: '2026-10-31'
      },
      {
        id: 'mt-6',
        name: 'Double Collar Tie Clinch Entry',
        traditionalName: 'ปล้ำ',
        category: 'Muay Plum / Clinch',
        discipline: 'muay_thai',
        beltRank: 'Level 1 Prajiad',
        description: 'Both forearms inside opponent neck, hands cupped on crown, elbows clamped together to break posture.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Kru Samart',
        verifiedAt: '2026-11-03'
      },
      {
        id: 'mt-7',
        name: 'Te Kha (Low Leg Kick to Thigh)',
        traditionalName: 'เตะขา',
        category: 'Te / Kicks',
        discipline: 'muay_thai',
        beltRank: 'Level 1 Prajiad',
        description: 'Stepping 45 degrees outside lead foot, chopping shin down into opponent common peroneal nerve.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Kru Samart',
        verifiedAt: '2026-11-06'
      },
      {
        id: 'mt-8',
        name: 'Shin Check / Block (Bang)',
        traditionalName: 'บล็อกแข้ง',
        category: 'Defense',
        discipline: 'muay_thai',
        beltRank: 'Level 1 Prajiad',
        description: 'Raise shin 45 degrees outward to meet incoming kick, connecting elbow to knee to seal ribs.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Kru Samart',
        verifiedAt: '2026-11-09'
      },
      {
        id: 'mt-9',
        name: 'Sok Ti (Downward Slashing Elbow)',
        traditionalName: 'ศอกตี',
        category: 'Sok / Elbows',
        discipline: 'muay_thai',
        beltRank: 'Level 1 Prajiad',
        description: 'Downward diagonal slice over opponent guard aiming for eyebrow or temple.',
        isMandatory: true,
        status: 'in_progress',
        verifiedBy: undefined,
        verifiedAt: undefined
      },
      {
        id: 'mt-10',
        name: 'Clinch Off-Balance & Turn',
        traditionalName: 'เหวี่ยง',
        category: 'Muay Plum / Clinch',
        discipline: 'muay_thai',
        beltRank: 'Level 1 Prajiad',
        description: 'Rotating steering-wheel grip while stepping backward to whip opponent onto unbalanced plane.',
        isMandatory: true,
        status: 'not_started',
        verifiedBy: undefined,
        verifiedAt: undefined
      }
    ]
  },
  krav_maga: {
    trackName: 'Tactical Krav Maga Civilian Level 1',
    beltName: 'Yellow Patch (P1 -> P2 Practitioner Criteria)',
    techniques: [
      {
        id: 'km-1',
        name: 'Straight Palm Heel Strike',
        traditionalName: 'Palm Combative',
        category: 'Strikes',
        discipline: 'krav_maga',
        beltRank: 'Practitioner 1',
        description: 'Open hand strike with base of palm driving through chin or nose with full bodyweight forward.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Instructor David',
        verifiedAt: '2026-10-15'
      },
      {
        id: 'km-2',
        name: '360-Degree Defense (Outside Attacks)',
        traditionalName: '360 Defense',
        category: 'Defenses',
        discipline: 'krav_maga',
        beltRank: 'Practitioner 1',
        description: 'Forearm intercepting circular strike at 90-degree wrist angle simultaneous with counter-punch.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Instructor David',
        verifiedAt: '2026-10-19'
      },
      {
        id: 'km-3',
        name: 'Front Choke Defense (Pluck & Strike)',
        traditionalName: 'Choke Release',
        category: 'Releases',
        discipline: 'krav_maga',
        beltRank: 'Practitioner 1',
        description: 'Explosive two-handed pluck of opponent thumbs while simultaneously driving groin kick and counter-strike.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Instructor David',
        verifiedAt: '2026-10-23'
      },
      {
        id: 'km-4',
        name: 'Rear Choke Defense with Step & Turn',
        traditionalName: 'Rear Choke',
        category: 'Releases',
        discipline: 'krav_maga',
        beltRank: 'Practitioner 1',
        description: 'Shoulder shrug, two-hand pluck, step backward behind opponent foot and rotate with hammerfist.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Instructor David',
        verifiedAt: '2026-10-27'
      },
      {
        id: 'km-5',
        name: 'Defensive Groin Kick from Neutral Stance',
        traditionalName: 'Groin Kick',
        category: 'Kicks',
        discipline: 'krav_maga',
        beltRank: 'Practitioner 1',
        description: 'Direct snap kick upward between opponent legs using top of foot or shin with immediate tactical disengagement.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Instructor David',
        verifiedAt: '2026-10-31'
      },
      {
        id: 'km-6',
        name: 'Hammerfist Strikes (Downward & Side)',
        traditionalName: 'Hammerfist',
        category: 'Strikes',
        discipline: 'krav_maga',
        beltRank: 'Practitioner 1',
        description: 'Using meaty bottom of clenched fist driving downwards onto collarbone or bridge of nose.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Instructor David',
        verifiedAt: '2026-11-03'
      },
      {
        id: 'km-7',
        name: 'Tactical Stand-Up from Guard',
        traditionalName: 'Get-Up',
        category: 'Ground Defense',
        discipline: 'krav_maga',
        beltRank: 'Practitioner 1',
        description: 'Protecting face with lead hand while kicking knee with bottom leg, sliding rear leg back to guard stance.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Instructor David',
        verifiedAt: '2026-11-06'
      },
      {
        id: 'km-8',
        name: 'Headlock from the Side Defense',
        traditionalName: 'Side Headlock',
        category: 'Releases',
        discipline: 'krav_maga',
        beltRank: 'Practitioner 1',
        description: 'Turn head toward torso, strike groin, reach over shoulder to pull facial lever/nose to peel off.',
        isMandatory: true,
        status: 'verified',
        verifiedBy: 'Instructor David',
        verifiedAt: '2026-11-09'
      },
      {
        id: 'km-9',
        name: 'Defense Against Overhead Knife Attack',
        traditionalName: 'Overhead Knife',
        category: 'Weapon Defense',
        discipline: 'krav_maga',
        beltRank: 'Practitioner 1',
        description: '360-degree high forearm block with immediate burst forward delivering palm strike to face.',
        isMandatory: true,
        status: 'in_progress',
        verifiedBy: undefined,
        verifiedAt: undefined
      },
      {
        id: 'km-10',
        name: 'Hostile Verbal De-escalation & Stance',
        traditionalName: 'Timeline',
        category: 'Situational Awareness',
        discipline: 'krav_maga',
        beltRank: 'Practitioner 1',
        description: 'Maintaining fence stance with open palms, boundary setting, and proactive scan for multiple attackers.',
        isMandatory: true,
        status: 'not_started',
        verifiedBy: undefined,
        verifiedAt: undefined
      }
    ]
  }
};

const DISCIPLINE_LABELS: Record<DisciplineType, string> = {
  brazilian_jiu_jitsu: 'Brazilian Jiu-Jitsu',
  karate: 'Shotokan Karate',
  taekwondo: 'WT Taekwondo',
  judo: 'Kodokan Judo',
  muay_thai: 'Muay Thai',
  krav_maga: 'Krav Maga'
};

interface TechniqueCurriculumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTechniqueVerified?: (verifiedCount: number) => void;
  verifiedTechniquesCount?: number;
}

export function TechniqueCurriculumModal({
  isOpen,
  onClose,
  onTechniqueVerified,
  verifiedTechniquesCount: initialCount = 8
}: TechniqueCurriculumModalProps) {
  const modalRef = useAccessibleModal(isOpen, onClose, '#btn-open-curriculum');
  const { activeSchool } = useTenant();
  const { activeRole, user } = useAuth();

  const isCoachOrOwner = activeRole === 'owner' || activeRole === 'coach';

  // Current active discipline tab (defaults to active school discipline)
  const initialDiscipline = (activeSchool?.discipline as DisciplineType) || 'brazilian_jiu_jitsu';
  const [selectedDiscipline, setSelectedDiscipline] = useState<DisciplineType>(initialDiscipline);
  const [curriculaState, setCurriculaState] = useState(DEFAULT_CURRICULA);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeCurriculum = curriculaState[selectedDiscipline] || DEFAULT_CURRICULA.brazilian_jiu_jitsu;
  const verifiedCount = activeCurriculum.techniques.filter((t) => t.status === 'verified').length;
  const totalCount = activeCurriculum.techniques.length;
  const progressPercent = Math.round((verifiedCount / totalCount) * 100);

  const handleToggleVerification = (techniqueId: string) => {
    if (!isCoachOrOwner) return;

    setCurriculaState((prev) => {
      const currentList = prev[selectedDiscipline].techniques;
      const updatedList = currentList.map((t) => {
        if (t.id === techniqueId) {
          const nextStatus: 'verified' | 'in_progress' = t.status === 'verified' ? 'in_progress' : 'verified';
          const verifiedBy = nextStatus === 'verified' ? (user?.fullName || 'Head Coach') : undefined;
          const verifiedAt = nextStatus === 'verified' ? new Date().toISOString().split('T')[0] : undefined;

          if (nextStatus === 'verified') {
            setActionFeedback(`Verified "${t.name}" for live grading criteria.`);
          } else {
            setActionFeedback(`Reopened "${t.name}" for student practice.`);
          }

          setTimeout(() => setActionFeedback(null), 3000);

          return {
            ...t,
            status: nextStatus,
            verifiedBy,
            verifiedAt
          };
        }
        return t;
      });

      const newVerifiedCount = updatedList.filter((t) => t.status === 'verified').length;
      if (onTechniqueVerified && selectedDiscipline === initialDiscipline) {
        onTechniqueVerified(newVerifiedCount);
      }

      return {
        ...prev,
        [selectedDiscipline]: {
          ...prev[selectedDiscipline],
          techniques: updatedList
        }
      };
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="curriculum-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-inverse-surface bg-opacity-60 backdrop-blur-sm"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-xl bg-surface-container-lowest border border-outline-variant shadow-hard-2 focus:outline-none overflow-hidden"
      >
        {/* Modal Top Header */}
        <div className="p-4 sm:p-6 pb-4 border-b border-outline-variant flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-label text-xs font-bold uppercase tracking-wider text-tertiary">
                Curriculum Single Source of Truth
              </span>
              <span className="font-label text-[10px] font-bold px-2 py-0.5 rounded bg-primary-container text-primary-on-container">
                Strict Multi-Tenant Scoping
              </span>
              <span className="font-label text-[10px] font-bold px-2 py-0.5 rounded bg-surface-container text-surface-on-variant">
                Tenant: {activeSchool?.name || 'Kaizen BJJ'}
              </span>
            </div>
            <h2 id="curriculum-modal-title" className="font-headline text-lg sm:text-xl font-bold text-primary">
              Martial Arts Technique Syllabus
            </h2>
            <p className="font-body text-xs text-surface-on-variant mt-0.5">
              Review and verify mandatory belt graduation requirements for {DISCIPLINE_LABELS[selectedDiscipline]}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close curriculum modal"
            className="p-1.5 rounded-lg text-surface-on-variant hover:text-surface-foreground hover:bg-surface-container transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary"
          >
            ✕
          </button>
        </div>

        {/* Discipline Switcher Tabs (Karate vs Taekwondo vs BJJ vs Judo etc.) */}
        <div className="px-4 sm:px-6 py-2.5 bg-surface-container-low border-b border-outline-variant flex items-center gap-1.5 overflow-x-auto">
          {(Object.keys(DISCIPLINE_LABELS) as DisciplineType[]).map((disc) => {
            const isSelected = selectedDiscipline === disc;
            const isSchoolNative = (activeSchool?.discipline || 'brazilian_jiu_jitsu') === disc;

            return (
              <button
                key={disc}
                type="button"
                onClick={() => setSelectedDiscipline(disc)}
                className={`px-3 py-1.5 rounded-[10px] text-xs font-label font-medium whitespace-nowrap transition-all duration-[200ms] cursor-pointer ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-soft-2 font-bold'
                    : 'bg-surface-container text-surface-on-variant hover:bg-surface-container-high hover:text-surface-foreground'
                }`}
              >
                {DISCIPLINE_LABELS[disc]}
                {isSchoolNative && (
                  <span className="ml-1.5 text-[9px] px-1 py-0.2 rounded bg-tertiary-container text-tertiary-on-container font-mono">
                    ACTIVE
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Progress & Graduation Eligibility Banner */}
        <div className="px-4 sm:px-6 py-3 bg-surface-container-lowest border-b border-outline-variant flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-title text-sm font-semibold text-primary">
              {activeCurriculum.trackName}
            </div>
            <div className="font-body text-xs text-surface-on-variant">
              {activeCurriculum.beltName}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="font-label text-xs font-bold text-primary">
                {verifiedCount} / {totalCount} Verified
              </div>
              <div className="font-body text-[11px] text-surface-on-variant">
                {progressPercent}% Complete
              </div>
            </div>
            <div className="w-24 sm:w-32 h-2.5 rounded-full bg-surface-container-high overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Action feedback toast */}
        {actionFeedback && (
          <div className="px-4 sm:px-6 py-2 bg-tertiary-container text-tertiary-on-container text-xs font-label font-semibold flex items-center justify-between border-b border-outline-variant animate-fadeIn">
            <span>✓ {actionFeedback}</span>
            <button type="button" onClick={() => setActionFeedback(null)} className="text-xs font-bold">×</button>
          </div>
        )}

        {/* Technique List Items */}
        <div className="p-4 sm:p-6 space-y-3 overflow-y-auto flex-1">
          {activeCurriculum.techniques.map((item, idx) => {
            const isVerified = item.status === 'verified';
            const isInProgress = item.status === 'in_progress';

            return (
              <div
                key={item.id}
                className="p-3.5 sm:p-4 rounded-xl bg-surface-container-lowest border border-outline-variant hover:border-outline transition-colors shadow-soft-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-label text-xs font-bold text-primary">
                      #{idx + 1} {item.name}
                    </span>
                    {item.traditionalName && (
                      <span className="font-body text-xs text-surface-on-variant italic">
                        ({item.traditionalName})
                      </span>
                    )}
                    <span className="font-label text-[10px] font-semibold px-2 py-0.5 rounded bg-surface-container text-surface-on-variant">
                      {item.category}
                    </span>
                    {item.isMandatory && (
                      <span className="font-label text-[9px] font-bold uppercase tracking-wider text-tertiary">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="font-body text-xs text-surface-on-variant leading-relaxed">
                    {item.description}
                  </p>
                  {isVerified && item.verifiedBy && (
                    <div className="font-label text-[11px] text-tertiary font-medium pt-0.5">
                      ✓ Verified by {item.verifiedBy} {item.verifiedAt ? `on ${item.verifiedAt}` : ''}
                    </div>
                  )}
                </div>

                {/* Status Badge & Coach Interaction */}
                <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-center">
                  <span
                    className={`font-label text-xs font-bold px-2.5 py-1 rounded-[8px] flex items-center gap-1 ${
                      isVerified
                        ? 'bg-tertiary-container text-tertiary-on-container'
                        : isInProgress
                        ? 'bg-primary-container text-primary-on-container'
                        : 'bg-surface-container text-surface-on-variant'
                    }`}
                  >
                    {isVerified ? '✓ Verified' : isInProgress ? '• In Progress' : 'Not Started'}
                  </span>

                  {isCoachOrOwner && (
                    <button
                      type="button"
                      onClick={() => handleToggleVerification(item.id)}
                      className={`px-3 py-1 rounded-[8px] text-xs font-label font-semibold transition-all duration-[200ms] cursor-pointer ${
                        isVerified
                          ? 'bg-surface-container hover:bg-surface-container-high text-surface-on-variant'
                          : 'bg-primary hover:bg-tertiary text-primary-foreground shadow-soft'
                      }`}
                    >
                      {isVerified ? 'Reopen' : 'Verify'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer / Tenant Invariant Notice */}
        <div className="p-4 sm:p-6 py-3.5 bg-surface-container-low border-t border-outline-variant flex flex-wrap items-center justify-between gap-3 text-xs text-surface-on-variant">
          <div className="font-body">
            <strong>Security Notice:</strong> In accordance with BeltTrack rules, accounts under{' '}
            <code className="font-mono text-[11px] font-bold text-primary">PENDING_APPROVAL</code> are blocked from curriculum access until admin verification.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-[10px] bg-primary text-primary-foreground font-label text-xs font-semibold hover:bg-tertiary transition-colors cursor-pointer"
          >
            Close Curriculum
          </button>
        </div>
      </div>
    </div>
  );
}

