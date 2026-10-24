import * as ResEdit from 'resedit';
import { readFileSync, writeFileSync } from 'node:fs';
export function brandExecutable(executable, icon, version) {
  const exe = ResEdit.NtExecutable.from(readFileSync(executable), { ignoreCert: true });
  const resource = ResEdit.NtExecutableResource.from(exe),
    image = ResEdit.Data.IconFile.from(readFileSync(icon));
  const groups = ResEdit.Resource.IconGroupEntry.fromEntries(resource.entries);
  for (const group of groups)
    ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
      resource.entries,
      group.id,
      group.lang,
      image.icons.map((i) => i.data),
    );
  const versions = ResEdit.Resource.VersionInfo.fromEntries(resource.entries);
  if (!versions.length) throw Error('Electron version resources missing');
  for (const info of versions) {
    info.setFileVersion(version, 1033);
    info.setProductVersion(version, 1033);
    info.setStringValues(
      { lang: 1033, codepage: 1200 },
      {
        CompanyName: 'ProgrammingWithYagle',
        FileDescription: 'Grave Accord',
        ProductName: 'Grave Accord',
        InternalName: 'Grave Accord',
        OriginalFilename: 'Grave Accord.exe',
        LegalCopyright: 'Grave Accord contributors. MIT license.',
      },
    );
    info.outputToResourceEntries(resource.entries);
  }
  resource.outputResource(exe);
  writeFileSync(executable, Buffer.from(exe.generate()));
}
