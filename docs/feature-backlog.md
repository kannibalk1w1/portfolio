# Feature Backlog

## CYP Profile Access

- Add a local password for each CYP profile so a young person can protect their own editor profile on shared machines.
- Add a mentor override/reset flow for forgotten CYP passwords.
- Store password data locally using a salted hash, not plain text.
- Keep mentor reset authority separate from the CYP password, ideally behind a mentor passcode or OS-level credential store.
- Ensure password protection affects editor/profile access only; generated static portfolio output should remain shareable unless a separate publishing privacy feature is added.
