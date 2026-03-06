export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <main className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Next.js Static Site
          </h1>
          <p className="text-xl text-gray-600">
            Deployed on AWS with S3 + CloudFront
          </p>
          <p className="text-sm text-gray-500 mt-2">PDP - March 2026</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            🚀 Deployment Stack
          </h2>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>
                <strong>Frontend:</strong> Next.js 16 with TypeScript
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>
                <strong>Hosting:</strong> AWS S3 (Static Website)
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>
                <strong>CDN:</strong> AWS CloudFront (HTTPS + Global
                Distribution)
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>
                <strong>CI/CD:</strong> AWS CodePipeline + CodeBuild
              </span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>
                <strong>Source:</strong> GitHub (Auto-deploy on push)
              </span>
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">📦 Features</h2>
          <div className="grid md:grid-cols-2 gap-4 text-gray-700">
            <div className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              <span>Static site generation</span>
            </div>
            <div className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              <span>TypeScript support</span>
            </div>
            <div className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              <span>Tailwind CSS styling</span>
            </div>
            <div className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              <span>Automated testing (Jest)</span>
            </div>
            <div className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              <span>Git-based deployment</span>
            </div>
            <div className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              <span>Environment variables (AWS SSM)</span>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>Built with ❤️ using Next.js and AWS</p>
        </div>
      </main>
    </div>
  );
}
