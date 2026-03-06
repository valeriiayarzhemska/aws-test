This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

aws codepipeline start-pipeline-execution --name nextjs-app-pipeline --region us-east-1

---

## 🚀 AWS Deployment - Complete CI/CD Pipeline

This project is fully configured for AWS deployment with automated CI/CD pipeline:

**Git Push → CodePipeline → CodeBuild → S3 → CloudFront CDN**

### 🎯 Quick Start (Automated)

Run this script to create all AWS resources automatically:

```bash
# Configure AWS credentials first
aws configure

# Run quick start script (creates S3 buckets, IAM roles)
./scripts/quick-start.sh
```

Then follow console prompts to create CloudFront, CodeBuild, and CodePipeline.

### 📖 Step-by-Step Guide (Recommended)

**NEW!** Complete walkthrough with AWS Console links:

📘 **[STEP_BY_STEP_IMPLEMENTATION.md](./STEP_BY_STEP_IMPLEMENTATION.md)** ⭐

This guide includes:

- ✅ Direct AWS Console links for every step
- ✅ Exact commands to run
- ✅ Screenshots and verification checkpoints
- ✅ Troubleshooting tips
- ✅ Estimated time for each section (~2-3 hours total)

**What you'll build:**

1. S3 bucket for hosting built files
2. S3 bucket for environment variables
3. CloudFront CDN for global caching
4. CodeBuild for automated builds
5. CodePipeline for CI/CD orchestration
6. Automatic deployment on every git push

### 📚 Additional Resources

- 📖 **[AWS_DEPLOYMENT_GUIDE.md](./AWS_DEPLOYMENT_GUIDE.md)** - Comprehensive reference guide
- 📋 **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Track your progress
- 📚 **[AWS_SERVICES_REFERENCE.md](./AWS_SERVICES_REFERENCE.md)** - Learn IAM, S3, CloudFront, etc.
- ⚡ **[GITHUB_ACTIONS_DEPLOY.md](./GITHUB_ACTIONS_DEPLOY.md)** - Alternative: GitHub Actions

### Alternative Options

#### Option 2: GitHub Actions (Simpler)

Pre-configured workflow for GitHub Actions deployment.

```bash
# Just add GitHub Secrets and push
# See GITHUB_ACTIONS_DEPLOY.md for setup
```

#### Option 3: AWS Amplify (Fastest)

One-command deployment with built-in CI/CD.

```bash
npm install -g @aws-amplify/cli
amplify init
amplify add hosting
amplify publish
```

### 💰 Estimated Costs

- **Free Tier**: ~$0-2/month
- **Low Traffic**: ~$2-7/month
- **Medium Traffic**: ~$10-20/month

Includes: S3 storage, CloudFront CDN, CodePipeline, CodeBuild

---

# openai-chat-integration
