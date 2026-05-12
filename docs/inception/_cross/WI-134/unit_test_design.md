# WI-134 Unit Test Design

<!-- @work-item-id WI-134 -->

- Clean/domain denies filesystem and network capabilities.
- Layered/repository allows database capability while controller denies it.
- Custom policy can override allowed capabilities.
- Dependency boundary checks remain unchanged.
- `RunL4ValidatorsUseCase` includes semantic capability findings in `L4-002` output.
