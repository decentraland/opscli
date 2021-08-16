# cdn-uploader

Usage

```bash
AWS_DEFAULT_REGION="us-east-1" \
AWS_ACCESS_KEY_ID="..." \
AWS_SECRET_ACCESS_KEY="..." \
  npx @dcl/cdn-uploader@next \
  --bucket full-bucket-name \
  --local-folder $(pwd)/dist \
  --bucket-folder 0.0.1-20210701
```