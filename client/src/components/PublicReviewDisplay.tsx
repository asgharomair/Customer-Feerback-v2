import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Star, Quote, Calendar, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// Note: Badge component can be added if needed, using inline styling for now

interface PublicReviewDisplayProps {
  tenantId: string;
  locationId?: string;
  maxReviews?: number;
  showAverageRating?: boolean;
}

// FR-080: Public review integration - Display recent feedback publicly
export default function PublicReviewDisplay({ 
  tenantId, 
  locationId, 
  maxReviews = 10,
  showAverageRating = true 
}: PublicReviewDisplayProps) {
  const [showAllReviews, setShowAllReviews] = useState(false);

  // Fetch public reviews (filtered to only show reviews marked as public)
  const { data: reviews, isLoading } = useQuery({
    queryKey: ["/api/public-reviews", tenantId, locationId],
    select: (data: any[]) => {
      // Filter only public reviews with ratings 4-5 for public display
      const publicReviews = data.filter((review: any) => 
        review.isPublic && review.overallRating >= 4
      );
      return showAllReviews ? publicReviews : publicReviews.slice(0, 5);
    },
  });

  // Fetch aggregate rating data
  const { data: metrics } = useQuery({
    queryKey: [`/api/analytics/metrics/${tenantId}`],
    enabled: showAverageRating,
  }) as { data: { averageRating: number; totalResponses: number } | undefined };

  const renderStars = (rating: number) => (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= rating 
              ? "fill-yellow-400 text-yellow-400" 
              : "text-gray-300"
          }`}
        />
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="text-center py-8">
          <Quote className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No public reviews to display yet.</p>
          <p className="text-sm text-gray-400 mt-2">
            Customer reviews will appear here when they choose to make them public.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Rating Summary */}
      {showAverageRating && metrics && (
        <Card className="bg-gradient-to-r from-primary/10 to-secondary/10">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Customer Reviews</CardTitle>
            <div className="flex items-center justify-center space-x-4 mt-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">
                  {Number(metrics.averageRating).toFixed(1)}
                </div>
                <div className="flex justify-center mt-1">
                  {renderStars(Math.round(metrics.averageRating))}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Based on {metrics.totalResponses} reviews
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Individual Reviews */}
      <div className="space-y-4">
        {reviews.map((review: any) => (
          <Card key={review.id} className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    {renderStars(review.overallRating)}
                    <span className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs">
                      {review.overallRating}/5
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500 space-x-4">
                    <span className="font-medium">
                      {review.customerName || "Anonymous"}
                    </span>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {review.location && (
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3" />
                        <span>{review.location.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {review.feedbackText && (
                <div className="mb-4">
                  <Quote className="w-4 h-4 text-gray-400 mb-2" />
                  <p className="text-gray-700 italic pl-6">
                    "{String(review.feedbackText)}"
                  </p>
                </div>
              )}

              {/* Voice Recording Player (if available) */}
              {review.voiceRecordingUrl && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Voice Feedback:</p>
                  <audio 
                    controls 
                    className="w-full h-8"
                    src={review.voiceRecordingUrl}
                  >
                    Your browser does not support audio playback.
                  </audio>
                </div>
              )}

              {/* Image Gallery (if available) */}
              {review.imageUrls && review.imageUrls.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">Photos:</p>
                  <div className="flex space-x-2 overflow-x-auto">
                    {review.imageUrls.map((url: string, index: number) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Review image ${index + 1}`}
                        className="w-20 h-20 object-cover rounded-lg flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => window.open(url, '_blank')}
                      />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Show More Button */}
      {reviews.length >= 5 && !showAllReviews && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => setShowAllReviews(true)}
            className="mt-4"
          >
            Show More Reviews
          </Button>
        </div>
      )}

      {/* Call to Action */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="text-center py-6">
          <h3 className="text-lg font-semibold mb-2">Share Your Experience</h3>
          <p className="text-gray-600 mb-4">
            Help others discover great experiences by sharing your feedback.
          </p>
          <Button className="bg-primary hover:bg-primary/90">
            Leave a Review
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}