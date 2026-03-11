import { Injectable } from '@angular/core';

const AVATAR_PATHS = [
  'assets/images/app/avatar/FaceIcon_Darkelf_magician_M.png',
  'assets/images/app/avatar/FaceIcon_Darkelf_magician_W.png',
  'assets/images/app/avatar/FaceIcon_Darkelf_soldier_M.png',
  'assets/images/app/avatar/FaceIcon_Darkelf_soldier_W.png',
  'assets/images/app/avatar/FaceIcon_Dwarf_soldier_M.png',
  'assets/images/app/avatar/FaceIcon_Dwarf_soldier_W.png',
  'assets/images/app/avatar/FaceIcon_Elf_magician_M.png',
  'assets/images/app/avatar/FaceIcon_Elf_magician_W.png',
  'assets/images/app/avatar/FaceIcon_Elf_soldier_M.png',
  'assets/images/app/avatar/FaceIcon_Elf_soldier_W.png',
  'assets/images/app/avatar/FaceIcon_Ertheia_magician_W.png',
  'assets/images/app/avatar/FaceIcon_Ertheia_soldier_W.png',
  'assets/images/app/avatar/FaceIcon_Human_magician_M.png',
  'assets/images/app/avatar/FaceIcon_Human_magician_W.png',
  'assets/images/app/avatar/FaceIcon_Human_soldier_M.png',
  'assets/images/app/avatar/FaceIcon_Human_soldier_W.png',
  'assets/images/app/avatar/FaceIcon_Kamael_soldier_M.png',
  'assets/images/app/avatar/FaceIcon_Kamael_soldier_W.png',
  'assets/images/app/avatar/FaceIcon_Orc_magician_M.png',
  'assets/images/app/avatar/FaceIcon_Orc_magician_W.png',
  'assets/images/app/avatar/FaceIcon_Orc_soldier_M.png',
  'assets/images/app/avatar/FaceIcon_Orc_soldier_W.png'
] as const;

@Injectable({ providedIn: 'root' })
export class SessionAvatarService {
  private currentEmail: string | null = null;
  private currentAvatar: string | null = null;

  resolve(email: string | null | undefined): string | null {
    if (!email) {
      this.currentEmail = null;
      this.currentAvatar = null;
      return null;
    }

    if (this.currentEmail !== email || !this.currentAvatar) {
      this.currentEmail = email;
      this.currentAvatar = this.pickRandomAvatar();
    }

    return this.currentAvatar;
  }

  private pickRandomAvatar(): string {
    const index = Math.floor(Math.random() * AVATAR_PATHS.length);
    return AVATAR_PATHS[index];
  }
}
