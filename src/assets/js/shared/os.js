import { escapeHtml } from './dom.js'
import { joinUrl } from './url.js'

/**
 * OS name/logo matching, keyword table ported from komari-next
 * src/utils/osImageHelper.ts (MIT, see THIRD_PARTY_NOTICES.md). Icons are the
 * upstream Worker's `/os-icons/` static assets, like flags; logos upstream does
 * not ship fall back to os-unknown.svg.
 */
const OS_CONFIGS = [
  ['AlmaLinux', 'os-alma.svg', ['alma', 'almalinux']],
  ['Alpine Linux', 'os-alpine.webp', ['alpine', 'alpine linux']],
  ['Armbian', 'os-armbian.png', ['armbian']],
  ['CentOS', 'os-centos.svg', ['centos', 'cent os']],
  ['Debian', 'os-debian.svg', ['debian', 'deb']],
  ['FreeBSD', 'os-unknown.svg', ['freebsd', 'bsd']],
  ['Ubuntu', 'os-ubuntu.svg', ['ubuntu', 'elementary']],
  ['Windows', 'os-windows.svg', ['windows', 'win', 'microsoft', 'ms']],
  ['Arch Linux', 'os-arch.svg', ['arch', 'archlinux', 'arch linux']],
  ['Kali Linux', 'os-kail.svg', ['kail', 'kali', 'kali linux']],
  ['iStoreOS', 'os-istore.png', ['istore', 'istoreos', 'istore os']],
  ['OpenWrt', 'os-openwrt.svg', ['openwrt', 'open wrt', 'open-wrt', 'qwrt']],
  ['ImmortalWrt', 'os-openwrt.svg', ['immortalwrt', 'immortal', 'emmortal']],
  ['NixOS', 'os-nix.svg', ['nixos', 'nix os', 'nix']],
  ['Rocky Linux', 'os-rocky.svg', ['rocky', 'rocky linux']],
  ['Fedora', 'os-fedora.svg', ['fedora']],
  ['openSUSE', 'os-openSUSE.svg', ['opensuse', 'suse']],
  ['Gentoo', 'os-gentoo.svg', ['gentoo']],
  ['Red Hat', 'os-redhat.svg', ['redhat', 'rhel', 'red hat']],
  ['Linux Mint', 'os-mint.svg', ['mint', 'linux mint']],
  ['Manjaro', 'os-manjaro-.svg', ['manjaro']],
  ['Synology DSM', 'os-synology.ico', ['synology', 'dsm', 'synology dsm']],
  ['Proxmox VE', 'os-proxmox.ico', ['proxmox', 'proxmox ve']],
  ['macOS', 'os-macos.svg', ['macos']],
  ['QTS', 'os-unknown.svg', ['qts', 'quts hero', 'qes', 'qutscloud']],
  ['Astra Linux', 'os-unknown.svg', ['astra', 'astra linux']],
  ['Orange Pi', 'os-unknown.svg', ['orange pi', 'orangepi']],
  ['Huawei', 'os-unknown.svg', ['huawei', 'euleros', 'euler os']],
  ['Aliyun', 'os-alibaba.svg', ['aliyun', 'alibaba']],
  ['OpenCloudOS', 'os-opencloud.svg', ['opencloud']],
  ['Unraid', 'os-unknown.svg', ['unraid']]
].map(([name, icon, keywords]) => ({ name, icon, keywords }))

const UNKNOWN_ICON = 'os-unknown.svg'

function findOs(value) {
  const input = String(value || '').toLowerCase().trim()
  if (!input) return null
  return OS_CONFIGS.find(config => config.keywords.some(keyword => input.includes(keyword))) || null
}

export function osName(value) {
  const match = findOs(value)
  if (match) return match.name
  const raw = String(value || '').trim()
  return raw ? raw.split(/[\s/]/)[0] || 'Unknown' : 'Unknown'
}

export function osIconMarkup(value, base = '') {
  const origin = base || (typeof location !== 'undefined' ? location.origin : '')
  const src = joinUrl(origin, `/os-icons/${findOs(value)?.icon || UNKNOWN_ICON}`)
  return `<img class="os-icon" src="${escapeHtml(src)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
}
