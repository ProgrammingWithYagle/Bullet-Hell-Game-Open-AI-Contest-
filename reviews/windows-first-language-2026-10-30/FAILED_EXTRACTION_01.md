# Preserved first extraction failure

The assistant started the extracted native smoke fixture before the archive verification command had finished. The native process exited without a report and created an89-byte debug.log. The verifier then rejected the extracted tree for that extra file. The audit finds all1899expected members and no missing member, with the debug file as the only extra. This tree and its launch/error logs are preserved as failed evidence; no portable or native acceptance is claimed for it.

The existing archive is reused only after exact member-set, unique paths, CRC and safe-path checks. A fresh extraction-r02must pass every manifest byte/hash before any native fixture starts. Reports/profiles stay outside the package. No original source, package or archive is changed.
